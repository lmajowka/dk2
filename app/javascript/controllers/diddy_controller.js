import { Controller } from "@hotwired/stimulus"

const DEFAULT_MAP = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,0,0,0,0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,0,0,0,0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,0,0,0,0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,0,0,0,0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,0,0,0,0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,0,0,0,0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1,1,1,1,0]
]

export default class extends Controller {
  static values = {
    backgroundUrl: String,
    spriteUrl: String,
    tileUrls: Array,
    goalTileId: Number,
    map: Array,
    levelCols: Number,
  }

  buildDefaultMap() {
    const rows = DEFAULT_MAP.length
    const cols = this.hasLevelColsValue ? this.levelColsValue : (DEFAULT_MAP[0]?.length || 24)

    const grid = Array.from({ length: rows }, () => new Array(cols).fill(0))
    if (rows > 0) {
      grid[rows - 1] = new Array(cols).fill(1)
    }
    return grid
  }

  connect() {
    this.canvas = this.element
    this.ctx = this.canvas.getContext("2d")

    this.grid = this.hasMapValue ? this.mapValue : this.buildDefaultMap()

    this.background = new Image()
    this.background.src = this.backgroundUrlValue

    this.sprite = new Image()
    this.sprite.src = this.spriteUrlValue

    this.tileImages = []
    this.tilesLoaded = 0

    const urls = this.hasTileUrlsValue ? this.tileUrlsValue : []
    this.tileCount = urls.length

    const onAllTilesLoaded = () => {
      const firstTile = this.tileImages[1]
      if (firstTile) {
        this.tileWidth = firstTile.naturalWidth || firstTile.width
        this.tileHeight = firstTile.naturalHeight || firstTile.height
      } else {
        this.tileWidth = 64
        this.tileHeight = 64
      }

      if (this.grid) {
        this.mapHeightPx = this.grid.length * this.tileHeight
        this.deathY = this.mapHeightPx + 200
      }

      this.respawn()
    }

    if (urls.length === 0) {
      this.tileWidth = 64
      this.tileHeight = 64
      if (this.grid) {
        this.mapHeightPx = this.grid.length * this.tileHeight
        this.deathY = this.mapHeightPx + 200
      }
      this.respawn()
    } else {
      urls.forEach((url, index) => {
        const img = new Image()
        img.onload = () => {
          this.tilesLoaded++
          if (this.tilesLoaded === this.tileCount) {
            onAllTilesLoaded()
          }
        }
        img.onerror = () => console.error(`Failed to load tile${index + 1} image`, url)
        img.src = url
        this.tileImages[index + 1] = img
      })
    }

    this.frameWidth = 36
    this.frameHeight = 40
    this.columns = 12
    this.walkFrames = 8
    this.rowRight = 6
    this.bodyOffset = -8
    this.innerOffsetX = 8

    this.worldX = this.canvas.width / 2
    this.cameraX = 0
    this.x = this.worldX
    this.worldY = this.canvas.height - this.frameHeight - 10
    this.y = this.worldY
    this.vy = 0
    this.onGround = false
    this.gravity = 1800
    this.jumpVelocity = 700
    this.deathY = this.canvas.height + 200
    this.cameraY = 0
    this.maxLives = 3
    this.lives = this.maxLives
    this.currentFrame = 0
    this.direction = "right"
    this.walking = false
    this.levelEnded = false
    this.levelEndedTime = 0

    this.speed = 180
    this.frameDuration = 80
    this.lastFrameTime = 0

    this.keys = { left: false, right: false }

    this.onKeyDown = this.onKeyDown.bind(this)
    this.onKeyUp = this.onKeyUp.bind(this)

    window.addEventListener("keydown", this.onKeyDown)
    window.addEventListener("keyup", this.onKeyUp)

    this.lastTimestamp = 0
    this.rafId = requestAnimationFrame(this.loop.bind(this))
  }

  disconnect() {
    window.removeEventListener("keydown", this.onKeyDown)
    window.removeEventListener("keyup", this.onKeyUp)

    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
    }
  }

  onKeyDown(e) {
    if (e.key === "ArrowLeft") {
      this.keys.left = true
      this.direction = "left"
      this.walking = true
    } else if (e.key === "ArrowRight") {
      this.keys.right = true
      this.direction = "right"
      this.walking = true
    } else if (e.code === "Space") {
      if (this.onGround) {
        this.vy = -this.jumpVelocity
        this.onGround = false
      }
    }
  }

  onKeyUp(e) {
    if (e.key === "ArrowLeft") {
      this.keys.left = false
    } else if (e.key === "ArrowRight") {
      this.keys.right = false
    }

    if (!this.keys.left && !this.keys.right) {
      this.walking = false
      this.currentFrame = 0
    }
  }

  loop(timestamp) {
    const delta = timestamp - this.lastTimestamp
    this.lastTimestamp = timestamp

    this.update(delta)

    if (this.sprite.complete) {
      this.draw()
    }

    this.rafId = requestAnimationFrame(this.loop.bind(this))
  }

  update(delta) {
    if (this.levelEnded) {
      this.levelEndedTime += delta
      return
    }

    const dt = delta / 1000

    if (this.keys.left) {
      this.worldX -= this.speed * dt
    }
    if (this.keys.right) {
      this.worldX += this.speed * dt
    }

    const levelWidthPx = this.getLevelWidthPx()
    if (levelWidthPx != null) {
      const maxWorldX = Math.max(0, levelWidthPx - this.frameWidth)
      if (this.worldX < 0) this.worldX = 0
      if (this.worldX > maxWorldX) this.worldX = maxWorldX
    } else {
      if (this.worldX < 0) this.worldX = 0
    }

    this.updateCamera()

    this.vy += this.gravity * dt
    this.worldY += this.vy * dt

    this.resolveGroundCollision()

    this.checkGoalReached()

    if (this.worldY > this.deathY) {
      this.loseLifeAndRestart()
      return
    }

    if (this.walking) {
      this.lastFrameTime += delta
      if (this.lastFrameTime >= this.frameDuration) {
        this.lastFrameTime = 0
        this.currentFrame = (this.currentFrame + 1) % this.walkFrames
      }
    }
  }

  getLevelWidthPx() {
    if (!this.tileWidth) return null

    if (this.grid) {
      const rows = this.grid.length
      const cols = rows > 0 ? this.grid[0].length : 0
      return cols * this.tileWidth
    }

    return null
  }

  tileAt(row, col) {
    if (!this.grid) return 0
    if (row < 0 || col < 0) return 0
    if (row >= this.grid.length) return 0
    if (col >= this.grid[0].length) return 0
    return this.grid[row][col]
  }

  isSolid(row, col) {
    const t = this.tileAt(row, col)
    return t > 0
  }

  isGoal(row, col) {
    const goalId = this.hasGoalTileIdValue ? this.goalTileIdValue : null
    if (goalId === null) return false
    return this.tileAt(row, col) === goalId
  }

  findSpawnY(worldX) {
    if (!this.tileWidth || !this.tileHeight) return null
    if (!this.grid) return null

    const footInset = 6
    const colLeft = Math.floor((worldX + footInset) / this.tileWidth)
    const colRight = Math.floor((worldX + this.frameWidth - footInset) / this.tileWidth)

    for (let row = this.grid.length - 1; row >= 0; row--) {
      if (this.isSolid(row, colLeft) || this.isSolid(row, colRight)) {
        return row * this.tileHeight - this.frameHeight
      }
    }

    return null
  }

  resolveGroundCollision() {
    if (!this.tileWidth || !this.tileHeight) return
    if (!this.grid) return

    if (this.vy < 0) {
      this.onGround = false
      return
    }

    const feetY = this.worldY + this.frameHeight

    const footInset = 6
    const footLeftX = this.worldX + footInset
    const footRightX = this.worldX + this.frameWidth - footInset

    const leftCol = Math.floor(footLeftX / this.tileWidth)
    const rightCol = Math.floor(footRightX / this.tileWidth)
    const rowUnder = Math.floor(feetY / this.tileHeight)

    const supported = this.isSolid(rowUnder, leftCol) || this.isSolid(rowUnder, rightCol)
    if (!supported) {
      this.onGround = false
      return
    }

    this.worldY = rowUnder * this.tileHeight - this.frameHeight
    this.vy = 0
    this.onGround = true
  }

  loseLifeAndRestart() {
    this.lives -= 1
    if (this.lives <= 0) {
      this.lives = this.maxLives
    }
    this.respawn()
  }

  checkGoalReached() {
    if (!this.tileWidth || !this.tileHeight) return
    if (!this.grid) return

    const footInset = 6
    const footLeftX = this.worldX + footInset
    const footRightX = this.worldX + this.frameWidth - footInset
    const feetY = this.worldY + this.frameHeight

    const leftCol = Math.floor(footLeftX / this.tileWidth)
    const rightCol = Math.floor(footRightX / this.tileWidth)
    const rowUnder = Math.floor(feetY / this.tileHeight)

    if (this.isGoal(rowUnder, leftCol) || this.isGoal(rowUnder, rightCol)) {
      this.levelEnded = true
      this.levelEndedTime = 0
    }
  }

  respawn() {
    this.cameraX = 0
    this.cameraY = 0
    this.worldX = 50
    this.levelEnded = false
    this.levelEndedTime = 0

    const spawnY = this.findSpawnY(this.worldX)
    if (spawnY != null) {
      this.worldY = spawnY
      this.onGround = true
    } else {
      this.worldY = this.canvas.height - this.frameHeight - 10
      this.onGround = false
    }

    this.vy = 0
    this.updateCamera()
    this.y = this.worldY - this.cameraY
  }

  updateCamera() {
    const levelWidthPx = this.getLevelWidthPx()
    const levelHeightPx = this.mapHeightPx || (this.grid ? this.grid.length * this.tileHeight : this.canvas.height)

    // Horizontal camera
    if (levelWidthPx != null) {
      const maxCameraX = Math.max(0, levelWidthPx - this.canvas.width)
      const centerX = this.canvas.width / 2

      const desiredCameraX = this.worldX - centerX
      if (desiredCameraX > this.cameraX) {
        this.cameraX = Math.min(desiredCameraX, maxCameraX)
      } else if (desiredCameraX < this.cameraX) {
        this.cameraX = Math.max(desiredCameraX, 0)
      }

      this.x = this.worldX - this.cameraX
      if (this.x < 0) this.x = 0
      if (this.x > this.canvas.width - this.frameWidth) {
        this.x = this.canvas.width - this.frameWidth
      }
    } else {
      this.x = this.worldX
    }

    // Vertical camera
    const maxCameraY = Math.max(0, levelHeightPx - this.canvas.height)
    const centerY = this.canvas.height / 2

    const desiredCameraY = this.worldY - centerY
    if (desiredCameraY > this.cameraY) {
      this.cameraY = Math.min(desiredCameraY, maxCameraY)
    } else if (desiredCameraY < this.cameraY) {
      this.cameraY = Math.max(desiredCameraY, 0)
    }

    this.y = this.worldY - this.cameraY
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    if (this.background.complete) {
      this.drawBottomAlignedCover(this.background)
    }

    if (this.tileWidth && this.tileHeight) {
      if (this.grid) {
        const rows = this.grid.length
        const cols = rows > 0 ? this.grid[0].length : 0

        const startCol = Math.max(0, Math.floor(this.cameraX / this.tileWidth))
        const endCol = Math.min(cols, startCol + Math.ceil(this.canvas.width / this.tileWidth) + 2)
        const startRow = Math.max(0, Math.floor(this.cameraY / this.tileHeight))
        const endRow = Math.min(rows, startRow + Math.ceil(this.canvas.height / this.tileHeight) + 2)

        for (let row = startRow; row < endRow; row++) {
          for (let col = startCol; col < endCol; col++) {
            const cell = this.grid[row][col]
            if (cell > 0 && this.tileImages[cell]) {
              this.ctx.drawImage(
                this.tileImages[cell],
                col * this.tileWidth - this.cameraX,
                row * this.tileHeight - this.cameraY,
                this.tileWidth,
                this.tileHeight,
              )
            }
          }
        }
      }
    }

    const sx = (this.currentFrame % this.columns) * this.frameWidth + this.innerOffsetX
    const sy = this.rowRight * this.frameHeight

    this.ctx.save()

    const dirSign = this.direction === "right" ? 1 : -1
    this.ctx.translate(this.x + this.frameWidth / 2 + this.bodyOffset * dirSign, this.y)

    if (this.direction === "left") {
      this.ctx.scale(-1, 1)
    }

    this.ctx.drawImage(
      this.sprite,
      sx,
      sy,
      this.frameWidth,
      this.frameHeight,
      -this.frameWidth / 2,
      0,
      this.frameWidth,
      this.frameHeight,
    )

    this.ctx.restore()

    if (this.levelEnded) {
      this.drawLevelEndedOverlay()
    }
  }

  drawLevelEndedOverlay() {
    const progress = Math.min(this.levelEndedTime / 500, 1)
    const alpha = progress * 0.7

    this.ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    if (progress >= 0.3) {
      const textProgress = Math.min((this.levelEndedTime - 150) / 300, 1)
      const scale = 0.5 + textProgress * 0.5
      const textAlpha = textProgress

      this.ctx.save()
      this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2)
      this.ctx.scale(scale, scale)

      this.ctx.font = "bold 48px Arial"
      this.ctx.textAlign = "center"
      this.ctx.textBaseline = "middle"

      this.ctx.fillStyle = `rgba(255, 215, 0, ${textAlpha})`
      this.ctx.fillText("LEVEL ENDED", 0, 0)

      this.ctx.strokeStyle = `rgba(139, 69, 19, ${textAlpha})`
      this.ctx.lineWidth = 3
      this.ctx.strokeText("LEVEL ENDED", 0, 0)

      this.ctx.restore()
    }
  }

  drawBottomAlignedCover(img) {
    const cw = this.canvas.width
    const ch = this.canvas.height
    const iw = img.naturalWidth || img.width
    const ih = img.naturalHeight || img.height

    if (!iw || !ih) return

    const scale = Math.max(cw / iw, ch / ih)
    const sw = cw / scale
    const sh = ch / scale

    const sx = (iw - sw) / 2
    const sy = ih - sh

    this.ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch)
  }
}
