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
        this.groundY = this.canvas.height - this.tileHeight
        this.groundCols = Math.ceil(this.canvas.width / this.tileWidth)
        this.y = this.groundY - this.frameHeight
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

    this.x = this.canvas.width / 2
    this.y = this.canvas.height - this.frameHeight - 10
    this.currentFrame = 0
    this.direction = "right"
    this.walking = false

    this.speed = 3
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
    if (this.keys.left) {
      this.x -= this.speed
    }
    if (this.keys.right) {
      this.x += this.speed
    }

    if (this.x < 0) this.x = 0
    if (this.x > this.canvas.width - this.frameWidth) {
      this.x = this.canvas.width - this.frameWidth
    }

    if (this.walking) {
      this.lastFrameTime += delta
      if (this.lastFrameTime >= this.frameDuration) {
        this.lastFrameTime = 0
        this.currentFrame = (this.currentFrame + 1) % this.walkFrames
      }
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

        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            if (this.grid[row][col] === 1) {
              this.ctx.drawImage(
                this.tile,
                col * this.tileWidth,
                row * this.tileHeight,
                this.tileWidth,
                this.tileHeight,
              )
            }
          }
        }
      } else {
        const groundCols = this.groundCols || Math.ceil(this.canvas.width / this.tileWidth)
        const groundY = this.groundY ?? this.canvas.height - this.tileHeight

        for (let col = 0; col < groundCols; col++) {
          this.ctx.drawImage(
            this.tile,
            col * this.tileWidth,
            groundY,
            this.tileWidth,
            this.tileHeight,
          )
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
