import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["grid", "input", "colsInput", "palette"]
  static values = {
    rows: Number,
    cols: Number,
    initialMap: Array,
    tile1Url: String,
    tile2Url: String,
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

    this.selectedTile = 1
    this.tile1Loaded = false
    this.tile2Loaded = false

    if (this.hasTile1UrlValue) {
      this.tile1Url = this.tile1UrlValue
      const img = new Image()
      img.onload = () => {
        this.tile1Loaded = true
        this.render()
      }
      img.src = this.tile1Url
    }

    if (this.hasTile2UrlValue) {
      this.tile2Url = this.tile2UrlValue
      const img = new Image()
      img.onload = () => {
        this.tile2Loaded = true
        this.render()
      }
      img.src = this.tile2Url
    }

    this.render()
    this.renderPalette()
    this.syncInput()
  }

  selectTile(event) {
    const tile = Number(event.params.tile)
    if (tile >= 0 && tile <= 2) {
      this.selectedTile = tile
      this.renderPalette()
    }
  }

  renderPalette() {
    if (!this.hasPaletteTarget) return

    const items = this.paletteTarget.querySelectorAll("[data-tile]")
    items.forEach((item) => {
      const tile = Number(item.dataset.tile)
      if (tile === this.selectedTile) {
        item.classList.add("selected")
      } else {
        item.classList.remove("selected")
      }
    })
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

  paint(event) {
    const row = Number(event.params.row)
    const col = Number(event.params.col)

    if (!Number.isFinite(row) || !Number.isFinite(col)) return
    if (row < 0 || col < 0) return
    if (row >= this.map.length) return
    if (col >= this.map[0].length) return

    this.map[row][col] = this.selectedTile
    this.updateCell(event.currentTarget, this.selectedTile)
    this.syncInput()
  }

  updateCell(cell, value) {
    cell.className = "map-editor-cell"
    if (value === 0) {
      cell.style.backgroundImage = "none"
      cell.classList.add("empty")
    } else if (value === 1 && this.tile1Url) {
      cell.style.backgroundImage = `url(${this.tile1Url})`
      cell.classList.remove("empty")
    } else if (value === 2 && this.tile2Url) {
      cell.style.backgroundImage = `url(${this.tile2Url})`
      cell.classList.remove("empty")
    }
  }

  render() {
    if (!this.hasGridTarget) return

    const rows = this.map.length
    const cols = rows > 0 ? this.map[0].length : 0
    const cellSize = 32

    this.gridTarget.style.display = "grid"
    this.gridTarget.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`
    this.gridTarget.style.gap = "1px"
    this.gridTarget.style.background = "#1a1a2e"
    this.gridTarget.style.padding = "4px"
    this.gridTarget.style.borderRadius = "8px"
    this.gridTarget.style.width = "fit-content"

    this.gridTarget.innerHTML = ""

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement("button")
        cell.type = "button"
        cell.className = "map-editor-cell"
        cell.dataset.action = "click->map-editor#paint"
        cell.dataset.mapEditorRowParam = String(r)
        cell.dataset.mapEditorColParam = String(c)

        cell.style.width = `${cellSize}px`
        cell.style.height = `${cellSize}px`
        cell.style.padding = "0"
        cell.style.border = "none"
        cell.style.cursor = "pointer"
        cell.style.backgroundSize = "cover"
        cell.style.backgroundPosition = "center"
        cell.style.borderRadius = "2px"
        cell.style.transition = "transform 0.1s, box-shadow 0.1s"

        const value = this.map[r][c]
        if (value === 0) {
          cell.style.background = "#16213e"
          cell.classList.add("empty")
        } else if (value === 1 && this.tile1Url) {
          cell.style.backgroundImage = `url(${this.tile1Url})`
        } else if (value === 2 && this.tile2Url) {
          cell.style.backgroundImage = `url(${this.tile2Url})`
        } else {
          cell.style.background = this.tileColor(value)
        }

        this.gridTarget.appendChild(cell)
      }
    }
  }

  syncInput() {
    if (!this.hasInputTarget) return
    this.inputTarget.value = JSON.stringify(this.map)
  }

  tileColor(value) {
    if (value === 1) return "#8B4513"
    if (value === 2) return "#228B22"
    return "#111"
  }
}
