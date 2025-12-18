export default class TileMap {
  constructor(grid, tileUrls, goalTileId = null) {
    this.grid = grid || []
    this.goalTileId = goalTileId
    this.tileImages = []
    this.tilesLoaded = 0
    this.tileCount = tileUrls.length
    this.tileWidth = 64
    this.tileHeight = 64
    this.ready = false

    this.loadTiles(tileUrls)
  }

  loadTiles(urls) {
    if (urls.length === 0) {
      this.ready = true
      return
    }

    urls.forEach((url, index) => {
      const img = new Image()
      img.onload = () => {
        this.tilesLoaded++
        if (this.tilesLoaded === this.tileCount) {
          this.onAllTilesLoaded()
        }
      }
      img.onerror = () => console.error(`Failed to load tile${index + 1} image`, url)
      img.src = url
      this.tileImages[index + 1] = img
    })
  }

  onAllTilesLoaded() {
    const firstTile = this.tileImages[1]
    if (firstTile) {
      this.tileWidth = firstTile.naturalWidth || firstTile.width
      this.tileHeight = firstTile.naturalHeight || firstTile.height
    }
    this.ready = true
  }

  get widthPx() {
    if (!this.grid || this.grid.length === 0) return null
    const cols = this.grid[0].length
    return cols * this.tileWidth
  }

  get heightPx() {
    if (!this.grid) return 0
    return this.grid.length * this.tileHeight
  }

  get deathY() {
    return this.heightPx + 200
  }

  tileAt(row, col) {
    if (!this.grid) return 0
    if (row < 0 || col < 0) return 0
    if (row >= this.grid.length) return 0
    if (col >= this.grid[0].length) return 0
    return this.grid[row][col]
  }

  isSolid(row, col) {
    return this.tileAt(row, col) > 0
  }

  isGoal(row, col) {
    if (this.goalTileId === null) return false
    return this.tileAt(row, col) === this.goalTileId
  }

  findSpawnY(worldX, frameWidth, frameHeight) {
    if (!this.grid) return null

    const footInset = 6
    const colLeft = Math.floor((worldX + footInset) / this.tileWidth)
    const colRight = Math.floor((worldX + frameWidth - footInset) / this.tileWidth)

    for (let row = this.grid.length - 1; row >= 0; row--) {
      if (this.isSolid(row, colLeft) || this.isSolid(row, colRight)) {
        return row * this.tileHeight - frameHeight
      }
    }

    return null
  }

  resolveGroundCollision(worldX, worldY, vy, frameWidth, frameHeight) {
    if (!this.grid) return { worldY, vy, onGround: false }

    if (vy < 0) {
      return { worldY, vy, onGround: false }
    }

    const feetY = worldY + frameHeight
    const footInset = 6
    const footLeftX = worldX + footInset
    const footRightX = worldX + frameWidth - footInset

    const leftCol = Math.floor(footLeftX / this.tileWidth)
    const rightCol = Math.floor(footRightX / this.tileWidth)
    const rowUnder = Math.floor(feetY / this.tileHeight)

    const supported = this.isSolid(rowUnder, leftCol) || this.isSolid(rowUnder, rightCol)
    if (!supported) {
      return { worldY, vy, onGround: false }
    }

    const newY = rowUnder * this.tileHeight - frameHeight
    return { worldY: newY, vy: 0, onGround: true }
  }

  checkGoalReached(worldX, worldY, frameWidth, frameHeight) {
    if (!this.grid) return false

    const footInset = 6
    const footLeftX = worldX + footInset
    const footRightX = worldX + frameWidth - footInset
    const feetY = worldY + frameHeight

    const leftCol = Math.floor(footLeftX / this.tileWidth)
    const rightCol = Math.floor(footRightX / this.tileWidth)
    const rowUnder = Math.floor(feetY / this.tileHeight)

    return this.isGoal(rowUnder, leftCol) || this.isGoal(rowUnder, rightCol)
  }

  draw(ctx, cameraX, cameraY, canvasWidth, canvasHeight) {
    if (!this.grid || this.grid.length === 0) return

    const rows = this.grid.length
    const cols = this.grid[0].length

    const startCol = Math.max(0, Math.floor(cameraX / this.tileWidth))
    const endCol = Math.min(cols, startCol + Math.ceil(canvasWidth / this.tileWidth) + 2)
    const startRow = Math.max(0, Math.floor(cameraY / this.tileHeight))
    const endRow = Math.min(rows, startRow + Math.ceil(canvasHeight / this.tileHeight) + 2)

    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const cell = this.grid[row][col]
        if (cell > 0 && this.tileImages[cell]) {
          ctx.drawImage(
            this.tileImages[cell],
            col * this.tileWidth - cameraX,
            row * this.tileHeight - cameraY,
            this.tileWidth,
            this.tileHeight,
          )
        }
      }
    }
  }
}
