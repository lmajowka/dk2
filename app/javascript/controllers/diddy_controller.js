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
    tileUrl: String,
    map: Array,
    levelCols: Number,
  }

  connect() {
    this.canvas = this.element
    this.ctx = this.canvas.getContext("2d")

    this.grid = this.hasMapValue ? this.mapValue : DEFAULT_MAP

    this.background = new Image()
    this.background.src = this.backgroundUrlValue

    this.sprite = new Image()
    this.sprite.src = this.spriteUrlValue

    this.tile = new Image()
    this.tile.onload = () => {
      this.tileWidth = this.tile.naturalWidth || this.tile.width
      this.tileHeight = this.tile.naturalHeight || this.tile.height

      if (this.grid && this.tileHeight) {
        const maxVisibleRows = Math.floor(this.canvas.height / this.tileHeight)
        if (maxVisibleRows > 0 && this.grid.length > maxVisibleRows) {
          this.grid = this.grid.slice(0, maxVisibleRows)
        }
      }

      if (this.grid) {
        const mapHeightPx = this.grid.length * this.tileHeight
        this.mapOffsetY = Math.max(0, this.canvas.height - mapHeightPx)
      }

      this.respawn()
    }
    this.tile.onerror = () => {
      console.error("Failed to load tile image", this.tileUrlValue)
    }

    if (this.hasTileUrlValue) {
      this.tile.src = this.tileUrlValue
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
    this.mapOffsetY = 0
    this.maxLives = 3
    this.lives = this.maxLives
    this.currentFrame = 0
    this.direction = "right"
    this.walking = false

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

    this.y = this.worldY

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
    return this.tileAt(row, col) === 1
  }

  findSpawnY(worldX) {
    if (!this.tileWidth || !this.tileHeight) return null
    if (!this.grid) return null

    const footInset = 6
    const colLeft = Math.floor((worldX + footInset) / this.tileWidth)
    const colRight = Math.floor((worldX + this.frameWidth - footInset) / this.tileWidth)

    for (let row = this.grid.length - 1; row >= 0; row--) {
      if (this.isSolid(row, colLeft) || this.isSolid(row, colRight)) {
        return this.mapOffsetY + row * this.tileHeight - this.frameHeight
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
    const rowUnder = Math.floor((feetY - this.mapOffsetY) / this.tileHeight)

    const supported = this.isSolid(rowUnder, leftCol) || this.isSolid(rowUnder, rightCol)
    if (!supported) {
      this.onGround = false
      return
    }

    this.worldY = this.mapOffsetY + rowUnder * this.tileHeight - this.frameHeight
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

  respawn() {
    this.cameraX = 0
    this.worldX = 50

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
    this.y = this.worldY
  }

  updateCamera() {
    const levelWidthPx = this.getLevelWidthPx()
    if (levelWidthPx == null) {
      this.x = this.worldX
      return
    }

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

        for (let row = 0; row < rows; row++) {
          for (let col = startCol; col < endCol; col++) {
            if (this.grid[row][col] === 1) {
              this.ctx.drawImage(
                this.tile,
                col * this.tileWidth - this.cameraX,
                this.mapOffsetY + row * this.tileHeight,
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
