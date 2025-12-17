import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["grid", "input", "colsInput", "palette", "propsInput", "propsPalette", "propsPreview", "enemiesInput", "enemiesPreview", "optionsPanel", "tilesPanel", "propsPanel", "enemiesPanel", "gridWrapper", "entitiesOverlay"]
  static values = {
    rows: Number,
    cols: Number,
    initialMap: Array,
    tileUrls: Array,
    propAssets: Array,
    initialProps: Array,
    initialEnemies: Array,
    enemyUrl: String,
  }

  connect() {
    const defaultRows = this.hasRowsValue ? this.rowsValue : 15
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
    this.tileImages = []
    this.tilesLoaded = 0

    const urls = this.hasTileUrlsValue ? this.tileUrlsValue : []
    this.tileCount = urls.length

    urls.forEach((url, index) => {
      const img = new Image()
      img.onload = () => {
        this.tilesLoaded++
        if (this.tilesLoaded === this.tileCount) {
          this.render()
        }
      }
      img.src = url
      this.tileImages[index + 1] = { url, img }
    })

    // Props initialization
    this.props = this.hasInitialPropsValue && Array.isArray(this.initialPropsValue)
      ? [...this.initialPropsValue]
      : []
    this.propAssets = this.hasPropAssetsValue ? this.propAssetsValue : []
    this.selectedProp = this.propAssets.length > 0 ? this.propAssets[0].id : null
    this.propImages = {}

    this.propAssets.forEach((prop) => {
      const img = new Image()
      img.src = prop.url
      this.propImages[prop.id] = { url: prop.url, img, name: prop.name }
    })

    // Enemies initialization
    this.enemies = this.hasInitialEnemiesValue && Array.isArray(this.initialEnemiesValue)
      ? [...this.initialEnemiesValue]
      : []
    this.enemyUrl = this.hasEnemyUrlValue ? this.enemyUrlValue : ""

    this.render()
    this.renderPalette()
    this.renderPropsPalette()
    this.renderPropsPreview()
    this.renderEnemiesPreview()
    this.renderEntitiesOverlay()
    this.syncInput()
    this.syncPropsInput()
    this.syncEnemiesInput()
  }

  togglePanel(event) {
    const panelName = event.params.panel
    const panels = ["options", "tiles", "props", "enemies"]
    const toolbarBtns = this.element.querySelectorAll(".toolbar-btn")

    panels.forEach((name) => {
      const panelTarget = this[`${name}PanelTarget`]
      const btn = this.element.querySelector(`[data-map-editor-panel-param="${name}"]`)
      
      if (name === panelName) {
        panelTarget.style.display = panelTarget.style.display === "none" ? "block" : "none"
        btn?.classList.toggle("active", panelTarget.style.display !== "none")
      } else {
        panelTarget.style.display = "none"
        btn?.classList.remove("active")
      }
    })
  }

  selectTile(event) {
    const tile = Number(event.params.tile)
    if (tile >= 0 && tile <= this.tileCount) {
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
        padded[i] = (Number.isInteger(v) && v >= 0) ? v : 0
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
    } else if (this.tileImages[value]) {
      cell.style.backgroundImage = `url(${this.tileImages[value].url})`
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
        } else if (this.tileImages[value]) {
          cell.style.backgroundImage = `url(${this.tileImages[value].url})`
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

  renderEntitiesOverlay() {
    if (!this.hasEntitiesOverlayTarget || !this.hasGridWrapperTarget) return

    const cellSize = 32
    const cols = this.cols
    const rows = this.rows
    const width = cols * cellSize + (cols - 1) + 8
    const height = rows * cellSize + (rows - 1) + 8

    this.gridWrapperTarget.style.position = "relative"
    this.gridWrapperTarget.style.width = "fit-content"

    this.entitiesOverlayTarget.style.position = "absolute"
    this.entitiesOverlayTarget.style.top = "4px"
    this.entitiesOverlayTarget.style.left = "4px"
    this.entitiesOverlayTarget.style.width = `${cols * cellSize + (cols - 1)}px`
    this.entitiesOverlayTarget.style.height = `${rows * cellSize + (rows - 1)}px`
    this.entitiesOverlayTarget.style.pointerEvents = "none"

    this.entitiesOverlayTarget.innerHTML = ""

    this.props.forEach((prop, index) => {
      const propData = this.propImages[prop.id]
      if (!propData) return

      const el = document.createElement("div")
      el.className = "entity-marker entity-prop"
      el.style.position = "absolute"
      el.style.left = `${prop.x}px`
      el.style.top = `${prop.y}px`
      el.style.width = "48px"
      el.style.height = "48px"
      el.style.backgroundImage = `url(${propData.url})`
      el.style.backgroundSize = "contain"
      el.style.backgroundRepeat = "no-repeat"
      el.style.backgroundPosition = "center"
      el.style.cursor = "move"
      el.style.pointerEvents = "auto"
      el.dataset.entityType = "prop"
      el.dataset.entityIndex = index
      el.title = propData.name

      this.setupDrag(el, index, "prop")
      this.entitiesOverlayTarget.appendChild(el)
    })

    this.enemies.forEach((enemy, index) => {
      const el = document.createElement("div")
      el.className = "entity-marker entity-enemy"
      el.style.position = "absolute"
      el.style.left = `${enemy.x}px`
      el.style.top = `${enemy.y}px`
      el.style.width = "32px"
      el.style.height = "32px"
      el.style.backgroundImage = `url(${this.enemyUrl})`
      el.style.backgroundSize = "contain"
      el.style.backgroundRepeat = "no-repeat"
      el.style.backgroundPosition = "center"
      el.style.cursor = "move"
      el.style.pointerEvents = "auto"
      el.dataset.entityType = "enemy"
      el.dataset.entityIndex = index
      el.title = `Inimigo ${index + 1}`

      this.setupDrag(el, index, "enemy")
      this.entitiesOverlayTarget.appendChild(el)
    })
  }

  setupDrag(el, index, type) {
    let startX, startY, initialX, initialY

    const onMouseDown = (e) => {
      e.preventDefault()
      startX = e.clientX
      startY = e.clientY
      const entity = type === "prop" ? this.props[index] : this.enemies[index]
      initialX = entity.x
      initialY = entity.y

      document.addEventListener("mousemove", onMouseMove)
      document.addEventListener("mouseup", onMouseUp)
    }

    const onMouseMove = (e) => {
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      const entity = type === "prop" ? this.props[index] : this.enemies[index]
      entity.x = Math.max(0, initialX + dx)
      entity.y = Math.max(0, initialY + dy)
      el.style.left = `${entity.x}px`
      el.style.top = `${entity.y}px`
    }

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup", onMouseUp)
      if (type === "prop") {
        this.syncPropsInput()
        this.renderPropsPreview()
      } else {
        this.syncEnemiesInput()
        this.renderEnemiesPreview()
      }
    }

    el.addEventListener("mousedown", onMouseDown)
  }

  // Props methods
  selectProp(event) {
    const propId = Number(event.params.prop)
    if (this.propImages[propId]) {
      this.selectedProp = propId
      this.renderPropsPalette()
    }
  }

  renderPropsPalette() {
    if (!this.hasPropsPaletteTarget) return

    const items = this.propsPaletteTarget.querySelectorAll("[data-prop]")
    items.forEach((item) => {
      const propId = Number(item.dataset.prop)
      if (propId === this.selectedProp) {
        item.classList.add("selected")
      } else {
        item.classList.remove("selected")
      }
    })
  }

  addProp(event) {
    event.preventDefault()
    if (this.selectedProp === null) return

    const prop = this.propImages[this.selectedProp]
    if (!prop) return

    // Default position at center of visible area
    const cellSize = 32
    const defaultX = Math.floor(this.cols / 2) * cellSize
    const defaultY = Math.floor(this.rows / 2) * cellSize

    this.props.push({
      id: this.selectedProp,
      x: defaultX,
      y: defaultY
    })

    this.renderPropsPreview()
    this.renderEntitiesOverlay()
    this.syncPropsInput()
  }

  removeProp(event) {
    event.preventDefault()
    const index = Number(event.params.index)
    if (index >= 0 && index < this.props.length) {
      this.props.splice(index, 1)
      this.renderPropsPreview()
      this.renderEntitiesOverlay()
      this.syncPropsInput()
    }
  }

  updatePropPosition(event) {
    const index = Number(event.target.dataset.propIndex)
    const axis = event.target.dataset.propAxis
    const value = Number(event.target.value)

    if (index >= 0 && index < this.props.length && (axis === "x" || axis === "y")) {
      this.props[index][axis] = value
      this.renderEntitiesOverlay()
      this.syncPropsInput()
    }
  }

  renderPropsPreview() {
    if (!this.hasPropsPreviewTarget) return

    if (this.props.length === 0) {
      this.propsPreviewTarget.innerHTML = '<p class="props-empty">Nenhuma prop adicionada. Clique em "Adicionar Prop" para começar.</p>'
      return
    }

    let html = '<div class="props-list">'
    this.props.forEach((prop, index) => {
      const propData = this.propImages[prop.id]
      const name = propData ? propData.name : `Prop ${prop.id}`
      const url = propData ? propData.url : ""

      html += `
        <div class="prop-item">
          <div class="prop-item-preview" style="background-image: url('${url}')"></div>
          <div class="prop-item-info">
            <span class="prop-item-name">${name}</span>
            <div class="prop-item-coords">
              <label>
                X: <input type="number" value="${prop.x}" 
                  data-prop-index="${index}" 
                  data-prop-axis="x"
                  data-action="change->map-editor#updatePropPosition">
              </label>
              <label>
                Y: <input type="number" value="${prop.y}" 
                  data-prop-index="${index}" 
                  data-prop-axis="y"
                  data-action="change->map-editor#updatePropPosition">
              </label>
            </div>
          </div>
          <button type="button" class="prop-item-remove" 
            data-action="click->map-editor#removeProp" 
            data-map-editor-index-param="${index}">✕</button>
        </div>
      `
    })
    html += '</div>'

    this.propsPreviewTarget.innerHTML = html
  }

  syncPropsInput() {
    if (!this.hasPropsInputTarget) return
    this.propsInputTarget.value = JSON.stringify(this.props)
  }

  // Enemy methods
  addEnemy(event) {
    event.preventDefault()
    if (!this.enemyUrl) return

    const cellSize = 32
    const defaultX = Math.floor(this.cols / 2) * cellSize
    const defaultY = Math.floor(this.rows / 2) * cellSize

    this.enemies.push({ x: defaultX, y: defaultY })
    this.renderEnemiesPreview()
    this.renderEntitiesOverlay()
    this.syncEnemiesInput()
  }

  removeEnemy(event) {
    event.preventDefault()
    const index = Number(event.params.index)
    if (index >= 0 && index < this.enemies.length) {
      this.enemies.splice(index, 1)
      this.renderEnemiesPreview()
      this.renderEntitiesOverlay()
      this.syncEnemiesInput()
    }
  }

  updateEnemyPosition(event) {
    const index = Number(event.target.dataset.enemyIndex)
    const axis = event.target.dataset.enemyAxis
    const value = Number(event.target.value)

    if (index >= 0 && index < this.enemies.length && (axis === "x" || axis === "y")) {
      this.enemies[index][axis] = value
      this.renderEntitiesOverlay()
      this.syncEnemiesInput()
    }
  }

  renderEnemiesPreview() {
    if (!this.hasEnemiesPreviewTarget) return

    if (this.enemies.length === 0) {
      this.enemiesPreviewTarget.innerHTML = '<p class="props-empty">Nenhum inimigo adicionado. Clique em "Adicionar Inimigo" para começar.</p>'
      return
    }

    let html = '<div class="props-list">'
    this.enemies.forEach((enemy, index) => {
      html += `
        <div class="prop-item">
          <div class="prop-item-preview" style="background-image: url('${this.enemyUrl}')"></div>
          <div class="prop-item-info">
            <span class="prop-item-name">Inimigo ${index + 1}</span>
            <div class="prop-item-coords">
              <label>
                X: <input type="number" value="${enemy.x}" 
                  data-enemy-index="${index}" 
                  data-enemy-axis="x"
                  data-action="change->map-editor#updateEnemyPosition">
              </label>
              <label>
                Y: <input type="number" value="${enemy.y}" 
                  data-enemy-index="${index}" 
                  data-enemy-axis="y"
                  data-action="change->map-editor#updateEnemyPosition">
              </label>
            </div>
          </div>
          <button type="button" class="prop-item-remove" 
            data-action="click->map-editor#removeEnemy" 
            data-map-editor-index-param="${index}">✕</button>
        </div>
      `
    })
    html += '</div>'

    this.enemiesPreviewTarget.innerHTML = html
  }

  syncEnemiesInput() {
    if (!this.hasEnemiesInputTarget) return
    this.enemiesInputTarget.value = JSON.stringify(this.enemies)
  }
}
