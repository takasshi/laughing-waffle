function initImageConverter(options) {
  const {
    mimeType,      // 'image/webp' / 'image/jpeg' など
    extension,     // 'webp' / 'jpg'
    formatName     // 'WebP' / 'JPEG'（エラーメッセージ表示用）
  } = options;

  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const resultList = document.getElementById('result-list');
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  const targetWidthInput = document.getElementById('target-width');
  const targetHeightInput = document.getElementById('target-height');
  const qualitySelect = document.getElementById('quality-select');
  const downloadAllBtn = document.getElementById('download-all');
  const backToTopBtn = document.getElementById('back-to-top');

  // バイト数を見やすい文字列に整形
  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = bytes / Math.pow(k, i);
    const fixed = value >= 10 ? 1 : 2;
    return value.toFixed(fixed) + ' ' + sizes[i];
  }

  // 画質プリセット → quality 数値に変換
  function getQualityValue() {
    const preset = qualitySelect.value;
    switch (preset) {
      case 'high':
        return 0.9; // 高画質
      case 'low':
        return 0.6; // 軽さ重視
      case 'medium':
      default:
        return 0.8; // 中間
    }
  }

  function getTargetSize(origW, origH) {
    let maxW = parseInt(targetWidthInput.value, 10);
    let maxH = parseInt(targetHeightInput.value, 10);

    // 未入力や0以下なら「その方向には制限なし」とみなす
    if (!maxW || maxW <= 0) maxW = origW;
    if (!maxH || maxH <= 0) maxH = origH;

    // 比率固定で「枠に収まるように」縮小
    const scale = Math.min(1, maxW / origW, maxH / origH);
    const w = Math.round(origW * scale);
    const h = Math.round(origH * scale);
    return { w, h };
  }

  function handleFiles(fileList) {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));

    if (!files.length) {
      alert('画像ファイルを選択してください 🖼️');
      return;
    }

    files.forEach(file => processFile(file));
  }

  function processFile(file) {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const { w, h } = getTargetSize(img.width, img.height);
      const quality = getQualityValue();

      canvas.width = w;
      canvas.height = h;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      // プレビュー用（JPEG固定でもOK）
      const previewUrl = canvas.toDataURL('image/jpeg', 0.8);

      canvas.toBlob(blob => {
        if (!blob) {
          alert(`${formatName} の生成に失敗しました: ` + file.name);
          URL.revokeObjectURL(url);
          return;
        }

        const blobUrl = URL.createObjectURL(blob);

        const baseName = file.name.replace(/\.[^.]+$/, '');
        const downloadName = baseName + '-resized.' + extension;

        const item = document.createElement('div');
        item.className = 'result-item';

        const previewImg = document.createElement('img');
        previewImg.src = previewUrl;
        previewImg.alt = baseName;

        const meta = document.createElement('div');
        meta.className = 'result-meta';

        const title = document.createElement('div');
        title.innerHTML = '<span class="label">元ファイル:</span> ' + file.name;

        const sizeInfo = document.createElement('div');
        sizeInfo.innerHTML =
          `<span class="label">画像サイズ:</span> ${img.width} x ${img.height}px → ${w} x ${h}px`;

        const fileSizeInfo = document.createElement('div');
        fileSizeInfo.innerHTML =
          `<span class="label">ファイルサイズ:</span> ${formatBytes(file.size)} → ${formatBytes(blob.size)}`;

        const presetLabel =
          qualitySelect.value === 'high' ? '高' :
          qualitySelect.value === 'low' ? '低' : '中';

        const qualityInfo = document.createElement('div');
        qualityInfo.innerHTML =
          `<span class="label">画質プリセット:</span> ${presetLabel}（quality=${quality}）`;

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = downloadName;
        link.textContent = 'この画像だけダウンロード ⬇️';
        link.className = 'download-link';

        meta.appendChild(title);
        meta.appendChild(sizeInfo);
        meta.appendChild(fileSizeInfo);
        meta.appendChild(qualityInfo);
        meta.appendChild(link);

        item.appendChild(previewImg);
        item.appendChild(meta);
        resultList.appendChild(item);

        // 何か1件でも追加されたら「全部ダウンロード」有効化
        downloadAllBtn.disabled = false;

        URL.revokeObjectURL(url);
      }, mimeType, quality);
    };

    img.onerror = () => {
      alert('画像の読み込みに失敗しました: ' + file.name);
      URL.revokeObjectURL(url);
    };

    img.src = url;
  }

  // ドラッグ＆ドロップ
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });

  // クリックでファイル選択
  dropZone.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    handleFiles(fileInput.files);
  });

  // 全部ダウンロード（zip なし・連続DL）
  downloadAllBtn.addEventListener('click', () => {
    const links = resultList.querySelectorAll('a.download-link');
    if (!links.length) return;

    links.forEach((link, index) => {
      setTimeout(() => {
        link.click();
      }, index * 150);
    });
  });

  // 上に戻るボタンの表示制御
  window.addEventListener('scroll', () => {
    if (window.scrollY > 200) {
      backToTopBtn.style.display = 'block';
    } else {
      backToTopBtn.style.display = 'none';
    }
  });

  // 上にスムーススクロール
  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}
