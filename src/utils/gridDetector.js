function dist(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
}

function smooth(arr, win) {
  const r = new Array(arr.length).fill(0)
  for (let i = 0; i < arr.length; i++) {
    let s = 0, n = 0
    for (let j = -win; j <= win; j++) { const k = i + j; if (k >= 0 && k < arr.length) { s += arr[k]; n++ } }
    r[i] = s / n
  }
  return r
}

function findGaps(signal, thresh, minGapDist, minWidth) {
  const gaps = []
  let inGap = false, start = 0
  for (let i = 0; i < signal.length; i++) {
    if (signal[i] < thresh) {
      if (!inGap) { inGap = true; start = i }
    } else if (inGap) {
      inGap = false
      if (i - start >= minWidth) gaps.push(Math.floor((start + i) / 2))
    }
  }
  if (inGap && signal.length - start >= minWidth) gaps.push(Math.floor((start + signal.length) / 2))
  if (gaps.length < 2) return gaps
  const merged = [gaps[0]]
  for (let i = 1; i < gaps.length; i++) {
    if (gaps[i] - merged[merged.length - 1] <= minGapDist) {
      merged[merged.length - 1] = Math.floor((merged[merged.length - 1] + gaps[i]) / 2)
    } else { merged.push(gaps[i]) }
  }
  return merged
}

function findContentArea(data, w, h, bgR, bgG, bgB, colorThresh) {
  const e = 5, thresh = 0.12
  function cardAt(x, y) {
    const idx = (y * w + x) * 4
    return dist(data[idx], data[idx + 1], data[idx + 2], bgR, bgG, bgB) > colorThresh
  }
  let top = e
  for (let y = e; y < h * 0.3; y++) {
    let n = 0; for (let x = 0; x < w; x += 3) { if (cardAt(x, y)) n++ }
    if (n / Math.ceil(w / 3) > thresh) { top = y; break }
  }
  let bottom = h - 1 - e
  for (let y = h - 1 - e; y > h * 0.7; y--) {
    let n = 0; for (let x = 0; x < w; x += 3) { if (cardAt(x, y)) n++ }
    if (n / Math.ceil(w / 3) > thresh) { bottom = y; break }
  }
  let left = e
  for (let x = e; x < w * 0.3; x++) {
    let n = 0; for (let y = top; y <= bottom; y += 3) { if (cardAt(x, y)) n++ }
    if (n / Math.ceil((bottom - top) / 3) > thresh) { left = x; break }
  }
  let right = w - 1 - e
  for (let x = w - 1 - e; x > w * 0.7; x--) {
    let n = 0; for (let y = top; y <= bottom; y += 3) { if (cardAt(x, y)) n++ }
    if (n / Math.ceil((bottom - top) / 3) > thresh) { right = x; break }
  }
  return { left, top, right, bottom }
}

function getBgAndCardChecker(data, w, h) {
  function px(x, y) { const idx = (y * w + x) * 4; return { r: data[idx], g: data[idx + 1], b: data[idx + 2] } }
  let bgR = 0, bgG = 0, bgB = 0, bgN = 0
  for (let x = 0; x < w; x += 3) { for (const y of [0, h - 1]) { const p = px(x, y); bgR += p.r; bgG += p.g; bgB += p.b; bgN++ } }
  for (let y = 0; y < h; y += 3) { for (const x of [0, w - 1]) { const p = px(x, y); bgR += p.r; bgG += p.g; bgB += p.b; bgN++ } }
  bgR = Math.round(bgR / bgN); bgG = Math.round(bgG / bgN); bgB = Math.round(bgB / bgN)
  const ct = 25
  return { bgR, bgG, bgB, cardAt: (x, y) => dist(data[(y * w + x) * 4], data[(y * w + x) * 4 + 1], data[(y * w + x) * 4 + 2], bgR, bgG, bgB) > ct }
}

function detectRowsCols(data, w, h, bgR, bgG, bgB, area) {
  const colorThresh = 25
  function cardAt(x, y) { return dist(data[(y * w + x) * 4], data[(y * w + x) * 4 + 1], data[(y * w + x) * 4 + 2], bgR, bgG, bgB) > colorThresh }
  const aw = area.right - area.left, ah = area.bottom - area.top
  if (aw < 20 || ah < 20) return { rows: 1, colsPerRow: [1] }

  const rowProj = new Array(ah).fill(0)
  for (let y = 0; y < ah; y++) { let n = 0, t = 0; for (let x = area.left; x <= area.right; x += 2) { if (cardAt(x, area.top + y)) n++; t++ } rowProj[y] = t > 0 ? n / t : 0 }
  const rowSm = smooth(rowProj, Math.max(1, Math.floor(ah * 0.002)))
  const rowGaps = findGaps(rowSm, 0.12, Math.max(2, Math.floor(ah * 0.004)), Math.max(2, Math.floor(ah * 0.002)))
  const innerRG = rowGaps.filter(g => g > ah * 0.01 && g < ah * 0.99)
  const rows = Math.max(1, Math.min(20, innerRG.length + 1))

  const colsPerRow = []
  const bounds = [0, ...innerRG, ah]
  for (let ri = 0; ri < rows; ri++) {
    const y1 = area.top + bounds[ri], y2 = area.top + bounds[ri + 1], rh = y2 - y1
    if (rh < 4) { colsPerRow.push(1); continue }
    const cp = new Array(aw).fill(0)
    for (let x = 0; x < aw; x++) { let n = 0, t = 0; for (let y = y1 + 2; y < y2 - 2; y += 2) { if (cardAt(area.left + x, y)) n++; t++ } cp[x] = t > 0 ? n / t : 0 }
    const cs = smooth(cp, Math.max(1, Math.floor(aw * 0.003)))
    const cg = findGaps(cs, 0.3, Math.max(2, Math.floor(aw * 0.003)), Math.max(2, Math.floor(aw * 0.002)))
    const icg = cg.filter(g => g > aw * 0.01 && g < aw * 0.99)
    colsPerRow.push(Math.max(1, Math.min(20, icg.length + 1)))
  }
  return { rows, colsPerRow }
}

export function detectGrid(image) {
  const origW = image.naturalWidth, origH = image.naturalHeight
  const MAX = 1000
  const scale = Math.min(1, MAX / Math.max(origW, origH))
  const w = Math.round(origW * scale), h = Math.round(origH * scale)
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const ctx = c.getContext('2d'); ctx.drawImage(image, 0, 0, w, h)
  const { data } = ctx.getImageData(0, 0, w, h)

  const { bgR, bgG, bgB } = getBgAndCardChecker(data, w, h)
  const area = findContentArea(data, w, h, bgR, bgG, bgB, 25)
  const result = detectRowsCols(data, w, h, bgR, bgG, bgB, area)

  const iv = 1 / scale
  return {
    ...result,
    contentRect: {
      left: Math.round(area.left * iv), top: Math.round(area.top * iv),
      right: Math.round(area.right * iv), bottom: Math.round(area.bottom * iv)
    }
  }
}

export function detectFromClick(image, clickX, clickY) {
  const origW = image.naturalWidth, origH = image.naturalHeight
  const MAX = 1000
  const scale = Math.min(1, MAX / Math.max(origW, origH))
  const w = Math.round(origW * scale), h = Math.round(origH * scale)
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const ctx = c.getContext('2d'); ctx.drawImage(image, 0, 0, w, h)
  const { data } = ctx.getImageData(0, 0, w, h)

  const { bgR, bgG, bgB, cardAt } = getBgAndCardChecker(data, w, h)
  const area = findContentArea(data, w, h, bgR, bgG, bgB, 25)

  const cx = Math.round(clickX * scale), cy = Math.round(clickY * scale)
  if (cx < area.left || cx > area.right || cy < area.top || cy > area.bottom) return detectGrid(image)

  // Find card boundaries from click
  function frac(x1, y1, x2, y2) { let n = 0, t = 0; for (let y = y1; y <= y2; y += 2) { for (let x = x1; x <= x2; x += 2) { if (cardAt(x, y)) n++; t++ } } return t > 0 ? n / t : 0 }

  let top = cy
  while (top > area.top + 3 && frac(cx - 6, top - 2, cx + 6, top) > 0.12) top -= 2
  while (top > area.top && frac(cx - 6, top, cx + 6, top) < 0.05) top--

  let bottom = cy
  while (bottom < area.bottom - 3 && frac(cx - 6, bottom, cx + 6, bottom + 2) > 0.12) bottom += 2
  while (bottom < area.bottom && frac(cx - 6, bottom, cx + 6, bottom) < 0.05) bottom++

  const midH = Math.floor((top + bottom) / 2)
  let left = cx
  while (left > area.left + 3 && frac(left - 2, midH - 3, left, midH + 3) > 0.12) left -= 2
  while (left > area.left && frac(left, midH - 3, left, midH + 3) < 0.05) left--

  let right = cx
  while (right < area.right - 3 && frac(right, midH - 3, right + 2, midH + 3) > 0.12) right += 2
  while (right < area.right && frac(right, midH - 3, right, midH + 3) < 0.05) right++

  const cardW = Math.max(10, right - left)
  const cardH = Math.max(10, bottom - top)

  // Scan area to count rows/cols using card dimensions as reference
  const cw = area.right - area.left, ch = area.bottom - area.top
  const gapH = Math.max(2, Math.round(cardH * 0.08))
  const totalSlotH = cardH + gapH
  const rawRows = Math.round(ch / totalSlotH)
  const rows = Math.max(1, Math.min(20, rawRows))

  const colsPerRow = []
  for (let ri = 0; ri < rows; ri++) {
    const ry = area.top + Math.round(ri * totalSlotH + totalSlotH * 0.3)
    const ryEnd = Math.min(area.bottom, area.top + Math.round((ri + 1) * totalSlotH - totalSlotH * 0.3))

    let cardPixels = 0, totalPixels = 0
    for (let y = ry; y < ryEnd; y += 2) {
      for (let x = area.left; x <= area.right; x += 3) {
        if (cardAt(x, y)) cardPixels++; totalPixels++
      }
    }
    if (cardPixels / totalPixels < 0.05) continue

    const gapW = Math.max(2, Math.round(cardW * 0.08))
    const totalSlotW = cardW + gapW
    const rawCols = Math.round(cw / totalSlotW)
    const cols = Math.max(1, Math.min(20, rawCols))
    colsPerRow.push(cols)
  }

  // If per-row detection gave too few rows, fall back
  if (colsPerRow.length < rows) {
    for (let i = colsPerRow.length; i < rows; i++) {
      colsPerRow.push(Math.max(1, Math.round(cw / (cardW + Math.max(2, Math.round(cardW * 0.08))))))
    }
  }

  const iv = 1 / scale
  return {
    rows: Math.max(rows, colsPerRow.length),
    colsPerRow,
    contentRect: {
      left: Math.round(area.left * iv), top: Math.round(area.top * iv),
      right: Math.round(area.right * iv), bottom: Math.round(area.bottom * iv)
    }
  }
}
