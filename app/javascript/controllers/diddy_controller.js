import { Controller } from "@hotwired/stimulus"

const DEFAULT_MAP = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
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

    this.grid = this.hasMapValue ? this.mapValue : null

    this.background = new Image()
    this.background.src = this.backgroundUrlValue

    this.sprite = new Image()
    this.sprite.src = this.spriteUrlValue

    this.tile = new Image()
    this.tile.onload = () => {
      this.tileWidth = this.tile.naturalWidth || this.tile.width
      this.tileHeight = this.tile.naturalHeight || this.tile.height

      if (!this.grid) {
        this.buildTestGround()
        this.groundY = this.canvas.height - this.tileHeight
        this.groundCols = Math.ceil(this.canvas.width / this.tileWidth)
        this.respawn()
      }
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

    if (this.ground) {
      return this.ground.length * this.tileWidth
    }

    const levelCols = this.hasLevelColsValue ? this.levelColsValue : 80
    return levelCols * this.tileWidth
  }

  buildTestGround() {
    const levelCols = this.hasLevelColsValue ? this.levelColsValue : 80
    this.ground = new Array(levelCols).fill(1)

    const holeStart = Math.min(levelCols - 1, 30)
    const holeWidth = 6
    for (let i = 0; i < holeWidth; i++) {
      const col = holeStart + i
      if (col >= 0 && col < this.ground.length) {
        this.ground[col] = 0
      }
    }
  }

  hasGroundAt(col) {
    if (!this.ground) return true
    if (col < 0 || col >= this.ground.length) return false
    return this.ground[col] === 1
  }

  resolveGroundCollision() {
    if (!this.tileWidth || !this.tileHeight) return
    if (this.groundY == null) return

    const feetY = this.worldY + this.frameHeight
    if (feetY < this.groundY) {
      this.onGround = false
      return
    }

    const footInset = 6
    const footLeftX = this.worldX + footInset
    const footRightX = this.worldX + this.frameWidth - footInset

    const leftCol = Math.floor(footLeftX / this.tileWidth)
    const rightCol = Math.floor(footRightX / this.tileWidth)

    const supported = this.hasGroundAt(leftCol) || this.hasGroundAt(rightCol)
    if (!supported) {
      this.onGround = false
      return
    }

    this.worldY = this.groundY - this.frameHeight
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
    if (this.groundY != null) {
      this.worldY = this.groundY - this.frameHeight
    } else {
      this.worldY = this.canvas.height - this.frameHeight - 10
    }
    this.vy = 0
    this.onGround = true
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
                row * this.tileHeight,
                this.tileWidth,
                this.tileHeight,
              )
            }
          }
        }
      } else {
        const groundY = this.groundY ?? this.canvas.height - this.tileHeight

        const levelWidthPx = this.getLevelWidthPx()
        const worldCols = levelWidthPx != null ? Math.ceil(levelWidthPx / this.tileWidth) : 0
        const startCol = Math.max(0, Math.floor(this.cameraX / this.tileWidth))
        const endCol = Math.min(worldCols, startCol + Math.ceil(this.canvas.width / this.tileWidth) + 2)

        for (let col = startCol; col < endCol; col++) {
          if (this.hasGroundAt(col)) {
            this.ctx.drawImage(
              this.tile,
              col * this.tileWidth - this.cameraX,
              groundY,
              this.tileWidth,
              this.tileHeight,
            )
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
