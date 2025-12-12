import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["grid", "input"]
  static values = {
    rows: Number,
    cols: Number,
    initialMap: Array,
  }

  connect() {
    this.rows = this.hasRowsValue ? this.rowsValue : 10
    this.cols = this.hasColsValue ? this.colsValue : 24

    if (this.hasInitialMapValue && Array.isArray(this.initialMapValue) && this.initialMapValue.length > 0) {
      this.map = this.normalizeMap(this.initialMapValue)
      this.rows = this.map.length
      this.cols = this.map[0]?.length || this.cols
    } else {
      this.map = this.buildEmptyMap(this.rows, this.cols)
      if (this.rows > 0) {
        this.map[this.rows - 1] = new Array(this.cols).fill(1)
      }
    }

    this.render()
    this.syncInput()
  }

  normalizeMap(map) {
    const rows = Array.isArray(map) ? map : []
    const maxCols = rows.reduce((m, r) => Math.max(m, Array.isArray(r) ? r.length : 0), 0)

    return rows.map((row) => {
      const r = Array.isArray(row) ? row : []
      const padded = new Array(maxCols).fill(0)
      for (let i = 0; i < maxCols; i++) {
        padded[i] = r[i] === 1 ? 1 : 0
      }
      return padded
    })
  }

  buildEmptyMap(rows, cols) {
    return Array.from({ length: rows }, () => new Array(cols).fill(0))
  }

  toggle(event) {
    const row = Number(event.params.row)
    const col = Number(event.params.col)

    if (!Number.isFinite(row) || !Number.isFinite(col)) return
    if (row < 0 || col < 0) return
    if (row >= this.map.length) return
    if (col >= this.map[0].length) return

    this.map[row][col] = this.map[row][col] === 1 ? 0 : 1
    this.render()
    this.syncInput()
  }

  render() {
    if (!this.hasGridTarget) return

    const rows = this.map.length
    const cols = rows > 0 ? this.map[0].length : 0

    this.gridTarget.style.display = "grid"
    this.gridTarget.style.gridTemplateColumns = `repeat(${cols}, 20px)`
    this.gridTarget.style.gap = "2px"

    this.gridTarget.innerHTML = ""

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement("button")
        cell.type = "button"
        cell.dataset.action = "click->map-editor#toggle"
        cell.dataset.mapEditorRowParam = String(r)
        cell.dataset.mapEditorColParam = String(c)

        cell.style.width = "20px"
        cell.style.height = "20px"
        cell.style.padding = "0"
        cell.style.border = "1px solid #444"
        cell.style.background = this.map[r][c] === 1 ? "#e11d48" : "#111"

        this.gridTarget.appendChild(cell)
      }
    }
  }

  syncInput() {
    if (!this.hasInputTarget) return
    this.inputTarget.value = JSON.stringify(this.map)
  }
}
