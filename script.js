// ===== データ保存と読み込み =====
let categories = JSON.parse(localStorage.getItem('categories') || '[]');
let currentCategoryId = null;

function saveData() {
  localStorage.setItem('categories', JSON.stringify(categories));
}

function loadData() {
  categories = JSON.parse(localStorage.getItem('categories') || '[]');
}

// 既存データを「子対応」に整える関数
function normalizeData() {
  categories.forEach(cat => {
    (cat.items || []).forEach(item => {
      if (!Array.isArray(item.children)) item.children = [];
      if (typeof item.collapsed !== 'boolean') item.collapsed = false;
      if (typeof item.stamped !== 'boolean') item.stamped = false;
      item.children.forEach(ch => {
        if (typeof ch.stamped !== 'boolean') ch.stamped = false;
      });
    });
  });
}

///////////////////////////////////////////

function getCategoryTotals(cat) {
  let total = 0;
  let completed = 0;
  (cat.items || []).forEach(item => {
    if (!Array.isArray(item.children)) item.children = [];
    total += 1;                       // 親
    if (item.stamped) completed += 1;
    total += item.children.length;    // 子の数
    item.children.forEach(ch => {
      if (ch.stamped) completed += 1;
    });
  });
  return { total, completed };
}



// ===== 画面描画 =====
function updateProgress() {
  categories.forEach(cat => {
    const { total, completed } = getCategoryTotals(cat);
    cat.progress = `${completed}/${total}`;
  });
}


function renderCategories() {
  updateProgress();
  const list = document.getElementById('category-list');
  list.innerHTML = '';

  categories.forEach((cat, index) => {
    const div = document.createElement('div');
    div.className = 'category-item';

    // 進捗計算（子も含む）↓↓↓↓
    const { total, completed } = getCategoryTotals(cat); // ← 置き換え
    const percent = total === 0 ? 0 : (completed / total) * 100;
    // ↑↑↑↑

    // 進捗円グラフ（以下はそのまま）
    const radius = 14;
    const circumference = 2 * Math.PI * radius;
    const hue = 80 + (210 - 80) * (percent / 100); // 黄緑→青
    const circleWrapper = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    circleWrapper.setAttribute('class', 'progress-circle');
    circleWrapper.setAttribute('viewBox', '0 0 40 40');

    const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bgCircle.setAttribute('cx', '20');
    bgCircle.setAttribute('cy', '20');
    bgCircle.setAttribute('r', radius);
    bgCircle.setAttribute('stroke', '#eee');
    bgCircle.setAttribute('stroke-width', '4');
    bgCircle.setAttribute('fill', 'none');

    const fgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    fgCircle.setAttribute('cx', '20');
    fgCircle.setAttribute('cy', '20');
    fgCircle.setAttribute('r', radius);
    fgCircle.setAttribute('stroke', `hsl(${hue}, 80%, 50%)`);
    fgCircle.setAttribute('stroke-width', '4');
    fgCircle.setAttribute('fill', 'none');
    fgCircle.setAttribute('stroke-dasharray', circumference);
    fgCircle.setAttribute('stroke-dashoffset', circumference);
    fgCircle.style.transition = 'stroke-dashoffset 0.5s ease, stroke 0.5s ease';

    circleWrapper.appendChild(bgCircle);
    circleWrapper.appendChild(fgCircle);

    requestAnimationFrame(() => {
      fgCircle.setAttribute('stroke-dashoffset', circumference * (1 - percent / 100));
    });

    const name = document.createElement('span');
    name.textContent = cat.name;
    name.className = 'category-name';

    const progress = document.createElement('span');
    progress.className = 'category-progress';
    progress.textContent = cat.progress;

    const menuBtn = document.createElement('button');
    menuBtn.textContent = '⋯';
    menuBtn.className = 'menu-btn';
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showCategoryActionMenu(cat.id, index);
    });

    div.appendChild(circleWrapper);
    div.appendChild(name);
    div.appendChild(progress);
    div.appendChild(menuBtn);

    div.addEventListener('pointerup', (e) => {
      if (e.target.classList.contains('menu-btn')) return;
      openCategory(cat.id);
    });

    list.appendChild(div);
  });
}


// 

function renderItems() {
  const container = document.getElementById("item-list");
  container.innerHTML = "";

  const category = categories.find(c => c.id === currentCategoryId);
  if (!category) return;

  category.items.forEach((item, index) => {
    // 親アイテムラッパー
    const parentDiv = document.createElement("div");
    parentDiv.className = "item parent-item";

    // 親のスタンプ
    const stamp = document.createElement("img");
    stamp.src = getStampIcon(item);
    stamp.className = "stamp-icon";
    stamp.addEventListener("click", (e) => {
      e.stopPropagation();
      item.stamped = !item.stamped;
      playStampSound(item.stamped);
      saveData();
      renderItems();
      renderCategories();
    });

    // 親テキスト
    const span = document.createElement("span");
    span.textContent = item.text;
    span.className = "item-text";

    // 親メニュー
    const menuBtn = document.createElement("button");
    menuBtn.textContent = "⋯";
    menuBtn.className = "item-menu-btn";
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      showItemActionMenu(index);
    });

    parentDiv.appendChild(stamp);
    parentDiv.appendChild(span);
    parentDiv.appendChild(menuBtn);

    // 子アイテムラッパー
    const childrenWrap = document.createElement("div");
    childrenWrap.className = "children-wrap";
    if (item.collapsed) childrenWrap.style.display = "none";

    (item.children || []).forEach((child, childIndex) => {
      const childDiv = document.createElement("div");
      childDiv.className = "item child-item";

      const childStamp = document.createElement("img");
      childStamp.src = child.stamped
        ? "icons/stamp_normal_complete.svg"
        : "icons/stamp_normal_incomplete.svg";
      childStamp.className = "stamp-icon";
      childStamp.addEventListener("click", (e) => {
        e.stopPropagation();
        child.stamped = !child.stamped;
        playStampSound(child.stamped);

        // 子が全部完了なら親も完了、そうでなければ未完了
        if (item.children.every(c => c.stamped)) {
          item.stamped = true;
        } else {
          item.stamped = false;
        }

        saveData();
        renderItems();
        renderCategories();
      });

      const childSpan = document.createElement("span");
      childSpan.textContent = child.text;
      childSpan.className = "item-text";

      // 子のメニュー
      const childMenuBtn = document.createElement("button");
      childMenuBtn.textContent = "⋯";
      childMenuBtn.className = "item-menu-btn";
      childMenuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        showChildActionMenu(index, childIndex);
      });

      childDiv.appendChild(childStamp);
      childDiv.appendChild(childSpan);
      childDiv.appendChild(childMenuBtn);
      childrenWrap.appendChild(childDiv);
    });

    // 親クリックで折りたたみ切り替え
    parentDiv.addEventListener("click", (e) => {
      if (e.target === stamp || e.target === menuBtn) return;
      item.collapsed = !item.collapsed;
      saveData();
      renderItems();
    });

    container.appendChild(parentDiv);
    container.appendChild(childrenWrap);
  });
}

// --- スタンプ音再生 ---
function playStampSound(stamped) {
  const audio = new Audio(stamped ? "sounds/stamp_on.mp3" : "sounds/stamp_off.mp3");
  audio.play();
}

// --- 親スタンプアイコンの判定 ---
function getStampIcon(item) {
  if (item.stamped) {
    return item.children && item.children.length > 0
      ? "icons/stamp_parent_complete.svg"
      : "icons/stamp_normal_complete.svg";
  } else {
    return item.children && item.children.length > 0
      ? "icons/stamp_parent_incomplete.svg"
      : "icons/stamp_normal_incomplete.svg";
  }
}


// --- 子アイテム用メニュー ---
function showChildActionMenu(parentIndex, childIndex) {
  const menu = document.getElementById("child-action-menu");
  menu.classList.add("show");
  disableBackgroundInteraction(true);

  const category = categories.find(c => c.id === currentCategoryId);
  const parent = category.items[parentIndex];
  const arr = parent.children;

  document.getElementById("move-child-up-btn").onclick = () => {
    if (childIndex > 0) {
      [arr[childIndex - 1], arr[childIndex]] = [arr[childIndex], arr[childIndex - 1]];
      saveData();
      renderItems();
    }
    closeMenus();
  };

  document.getElementById("move-child-down-btn").onclick = () => {
    if (childIndex < arr.length - 1) {
      [arr[childIndex + 1], arr[childIndex]] = [arr[childIndex], arr[childIndex + 1]];
      saveData();
      renderItems();
    }
    closeMenus();
  };

  document.getElementById("rename-child-btn").onclick = () => {
    const newName = prompt("新しい名前を入力してください", arr[childIndex].text);
    if (newName) {
      arr[childIndex].text = newName;
      saveData();
      renderItems();
    }
    closeMenus();
  };

  document.getElementById("delete-child-btn").onclick = () => {
    arr.splice(childIndex, 1);
    saveData();
    renderItems();
    closeMenus();
  };

  document.getElementById("cancel-child-btn").onclick = () => {
    closeMenus();
  };
}




// ===== 科目関連操作 =====
function addCategory() {
  const name = prompt('科目名を入力してください');
  if (name) {
    const newCategory = { id: Date.now(), name, items: [], progress: '0/0' };
    categories.push(newCategory);
    saveData();
    renderCategories();
  }
}

function moveCategoryUp(index) {
  if (index > 0) {
    [categories[index - 1], categories[index]] = [categories[index], categories[index - 1]];
    saveData();
    renderCategories();
  }
}

function moveCategoryDown(index) {
  if (index < categories.length - 1) {
    [categories[index + 1], categories[index]] = [categories[index], categories[index + 1]];
    saveData();
    renderCategories();
  }
}

function deleteCategory(id) {
  if (confirm('この科目を削除してもよろしいですか？')) {
    categories = categories.filter(c => c.id !== id);
    saveData();
    renderCategories();
  }
}

function renameCategory(id) {
  const cat = categories.find(c => c.id === id);
  if (!cat) return;

  const newName = prompt('新しい科目名を入力してください', cat.name);
  if (newName) {
    cat.name = newName;
    saveData();
    renderCategories();
  }
}

function openCategory(id) {
  currentCategoryId = id;
  const category = categories.find(c => c.id === id);
  if (!category) return;
  document.getElementById('subject-title').textContent = category.name;
  document.getElementById('screen1').classList.add('hidden');
  document.getElementById('screen2').classList.remove('hidden');
  renderItems();
}

function goBack() {
  document.getElementById('screen2').classList.add('hidden');
  document.getElementById('screen1').classList.remove('hidden');
  saveData();
  renderCategories();
}

// ===== 項目関連操作 =====

function addItem() {
  const category = categories.find(c => c.id === currentCategoryId);
  if (!category) {
    alert('先に科目を開いてから「＋」を押してください。');
    return;
  }
  const text = prompt('項目名を入力してください');
  if (text) {
    const category = categories.find(c => c.id === currentCategoryId);
    if (!category) return;
    category.items.push({
      text,
      stamped: false,
      children: [],      // ここが重要！
      collapsed: false   // 子の折りたたみ状態
    });
    saveData();
    renderItems();
    renderCategories();
  }
}


function moveItemUp(index) {
  const category = categories.find(c => c.id === currentCategoryId);
  if (category && index > 0) {
    [category.items[index - 1], category.items[index]] = [category.items[index], category.items[index - 1]];
    saveData();
    renderItems();
  }
}

function moveItemDown(index) {
  const category = categories.find(c => c.id === currentCategoryId);
  if (category && index < category.items.length - 1) {
    [category.items[index + 1], category.items[index]] = [category.items[index], category.items[index + 1]];
    saveData();
    renderItems();
  }
}

function deleteItem(index) {
  if (confirm('この項目を削除してもよろしいですか？')) {
    const category = categories.find(c => c.id === currentCategoryId);
    if (category) {
      category.items.splice(index, 1);
      saveData();
      renderItems();
      renderCategories();
    }
  }
}

function renameItem(index) {
  const category = categories.find(c => c.id === currentCategoryId);
  if (!category) return;
  const newName = prompt('新しい項目名を入力してください', category.items[index].text);
  if (newName) {
    category.items[index].text = newName;
    saveData();
    renderItems();
  }
}


// ===== メニュー表示 =====
function showCategoryActionMenu(id, index) {
  const menu = document.getElementById('category-action-menu');
  menu.classList.add('show'); // 下から表示
  disableBackgroundInteraction(true);

  document.getElementById('move-category-up-btn').onclick = () => {
    moveCategoryUp(index);
    closeMenus();
  };
  document.getElementById('move-category-down-btn').onclick = () => {
    moveCategoryDown(index);
    closeMenus();
  };
  document.getElementById('rename-category-btn').onclick = () => {
    renameCategory(id);
    closeMenus();
  };
  document.getElementById('delete-category-btn').onclick = () => {
    deleteCategory(id);
    closeMenus();
  };
  document.getElementById('cancel-category-btn').onclick = () => {
    closeMenus();
  };
}

function showItemActionMenu(index) {
  const menu = document.getElementById('item-action-menu');
  menu.classList.add('show'); // 下から表示
  disableBackgroundInteraction(true);

  // --- 子アイテム追加ボタンを動的に差し込む（初回のみ作成） ---
  let addChildBtn = document.getElementById('add-child-item-btn');
  if (!addChildBtn) {
    addChildBtn = document.createElement('button');
    addChildBtn.id = 'add-child-item-btn';
    addChildBtn.textContent = '子アイテム追加';
    const cancelBtn = document.getElementById('cancel-item-btn');
    menu.insertBefore(addChildBtn, cancelBtn);  // キャンセルの直前に差し込む
  }
  addChildBtn.style.display = 'block'; // 親メニューでは表示

  // 既存の各ボタンの動作を設定
  document.getElementById('move-up-btn').onclick = () => {
    moveItemUp(index);
    closeMenus();
  };
  document.getElementById('move-down-btn').onclick = () => {
    moveItemDown(index);
    closeMenus();
  };
  document.getElementById('rename-item-btn').onclick = () => {
    renameItem(index);
    closeMenus();
  };
  document.getElementById('delete-item-btn').onclick = () => {
    deleteItem(index);
    closeMenus();
  };
  document.getElementById('cancel-item-btn').onclick = () => {
    closeMenus();
  };

  // 子アイテム追加
  addChildBtn.onclick = () => {
    addChildItem(index);
    closeMenus();
  };
}

// 子アイテムを追加する関数
function addChildItem(parentIndex) {
  const category = categories.find(c => c.id === currentCategoryId);
  if (!category) return;

  const parent = category.items[parentIndex];
  if (!parent) return;

  if (!Array.isArray(parent.children)) parent.children = [];

  const name = prompt('子アイテム名を入力してください');
  if (name) {
    parent.children.push({
      text: name,
      stamped: false
    });
    saveData();
    renderItems();
    renderCategories();
  }
}


// メニューを閉じる
function closeMenus() {
  document.querySelectorAll('.action-menu').forEach(menu => {
    menu.classList.remove('show');
  });
  disableBackgroundInteraction(false);
}




// メニューが開いている間の背景操作無効化
function disableBackgroundInteraction(disable) {
  const root = document.body;
  root.style.pointerEvents = disable ? 'none' : 'auto';
  const menus = document.querySelectorAll('.action-menu');
  menus.forEach(menu => menu.style.pointerEvents = 'auto');
}

// ===== 効果音 =====
function playSound(src) {
  const audio = new Audio(src);
  audio.play();
}



// ===== インポート／エクスポート（子アイテム対応済み） =====

// JSONエクスポート
function exportJSON() {
  const blob = new Blob([JSON.stringify(categories, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "data.json";
  a.click();
}

// JSONインポート（既存データを消して上書き）
function importJSON() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        categories = JSON.parse(ev.target.result); // 既存データを上書き
        normalizeData(); // 子アイテムや collapsed の初期化
        saveData();
        renderCategories();
        renderItems();
      } catch (err) {
        alert("JSONの読み込みに失敗しました");
        console.error(err);
      }
    };
    reader.readAsText(file);
  });
  input.click();
}


// ===== CSVインポート／エクスポート =====

function exportCSV() {
  let csv = "Category,Parent,Child,Done\n";
  categories.forEach(cat => {
    cat.items.forEach(item => {
      // 親アイテム自体
      csv += `${cat.name},${item.text},,${item.stamped ? 1 : 0}\n`;

      // 子アイテム
      (item.children || []).forEach(child => {
        csv += `${cat.name},${item.text},${child.text},${child.stamped ? 1 : 0}\n`;
      });
    });
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "data.csv";
  a.click();
}


// CSVインポート（既存データを消して上書き）
function importCSV() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".csv";
  input.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = ev.target.result.split("\n").slice(1); // ヘッダ除去
      let newCategories = [];

      lines.forEach(line => {
        if (!line.trim()) return;
        // カンマ前後の空白を除去して分割
        const [catNameRaw, parentTextRaw, childTextRaw, doneRaw] = line.split(/\s*,\s*/);
        const catName = catNameRaw?.trim();
        const parentText = parentTextRaw?.trim();
        const childText = childTextRaw?.trim();
        const doneFlag = doneRaw?.trim() === "1" || doneRaw?.trim() === 1;

        if (!catName || !parentText) return;

        // カテゴリ探す / なければ作る
        let category = newCategories.find(c => c.name === catName);
        if (!category) {
          category = { id: Date.now() + Math.random(), name: catName, items: [] };
          newCategories.push(category);
        }

        // 親探す / なければ作る
        let parent = category.items.find(i => i.text === parentText);
        if (!parent) {
          parent = { text: parentText, stamped: false, children: [], collapsed: false };
          category.items.push(parent);
        }

        if (childText) {
          // 子アイテム
          parent.children.push({
            text: childText,
            stamped: doneFlag
          });
        } else if (parent.stamped !== true) {
          // 親アイテムのスタンプは上書きしすぎない
          parent.stamped = doneFlag;
        }
      });

      categories = newCategories;
      normalizeData();
      saveData();
      renderCategories();
      renderItems();
    };

    reader.readAsText(file);
  });
  input.click();
}


// ===== イベント登録 =====

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('add-category-btn').addEventListener('click', addCategory);
  document.getElementById('add-item-btn').addEventListener('click', addItem);
  document.getElementById('back-btn').addEventListener('click', goBack);
  document.getElementById('csv-export-btn').addEventListener('click', exportCSV);
  document.getElementById('csv-import-btn').addEventListener('click', importCSV);
  document.getElementById('export-btn').addEventListener('click', exportJSON);
  document.getElementById('import-btn').addEventListener('click', importJSON);
});


// メニュー外クリックで閉じる（重複を1つに）
document.addEventListener('pointerdown', (e) => {
  const menus = document.querySelectorAll('.action-menu');
  if (![...menus].some(menu => menu.contains(e.target))) {
    closeMenus();
  }
});

loadData();
normalizeData();     // ← 追加：既存データを子対応へ
renderCategories();



