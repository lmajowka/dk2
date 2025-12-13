import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["grid", "input", "colsInput"]
  static values = {
    rows: Number,
    cols: Number,
    initialMap: Array,
  }

  connect() {
    const defaultRows = this.hasRowsValue ? this.rowsValue : 7
    const defaultCols = this.hasColsValue ? this.colsValue : 24
    this.rows = defaultRows
    this.cols = defaultCols

    if (this.hasInitialMapValue && Array.isArray(this.initialMapValue) && this.initialMapValue.length > 0) {
      const normalized = this.normalizeMap(this.initialMapValue)
      this.map = normalized.length > defaultRows ? normalized.slice(0, defaultRows) : normalized
      this.rows = this.map.length
      this.cols = this.map[0]?.length || defaultCols
    } else {
      this.map = this.buildEmptyMap(this.rows, this.cols)
      if (this.rows > 0) {
        this.map[this.rows - 1] = new Array(this.cols).fill(1)
      }
    }

    this.render()
    this.syncInput()
  }

  setCols(event) {
    const v = Number(event.target.value)
    if (!Number.isFinite(v)) return
    this.resizeCols(Math.max(1, Math.floor(v)))
  }

  addCols(event) {
    const delta = Number(event.params.delta)
    if (!Number.isFinite(delta)) return
    this.resizeCols(Math.max(1, this.cols + Math.floor(delta)))
  }

  resizeCols(newCols) {
    if (!Number.isFinite(newCols) || newCols < 1) return
    if (!this.map || this.map.length === 0) return
    if (newCols === this.cols) return

    const lastRow = this.map.length - 1

    for (let r = 0; r < this.map.length; r++) {
      const row = this.map[r]
      const fill = r === lastRow ? 1 : 0

      if (row.length < newCols) {
        row.push(...new Array(newCols - row.length).fill(fill))
      } else if (row.length > newCols) {
        row.splice(newCols)
      }
    }

    this.cols = newCols
    if (this.hasColsInputTarget) {
      this.colsInputTarget.value = String(newCols)
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
        const v = r[i]
        padded[i] = (v === 1 || v === 2) ? v : 0
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

    const current = this.map[row][col]
    this.map[row][col] = current === 0 ? 1 : current === 1 ? 2 : 0
    if (event.currentTarget) {
      event.currentTarget.style.background = this.tileColor(this.map[row][col])
    }
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
        cell.style.background = this.tileColor(this.map[r][c])

        this.gridTarget.appendChild(cell)
      }
    }
  }

  syncInput() {
    if (!this.hasInputTarget) return
    this.inputTarget.value = JSON.stringify(this.map)
  }

  tileColor(value) {
    if (value === 1) return "#e11d48"
    if (value === 2) return "#ff0000"
    return "#111"
  }
}
