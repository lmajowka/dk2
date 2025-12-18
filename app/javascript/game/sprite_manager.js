export default class SpriteManager {
  constructor(parent, spriteUrl, punchUrl, frameWidth = 64, frameHeight = 64) {
    this.parent = parent
    this.spriteUrl = spriteUrl
    this.punchUrl = punchUrl
    this.frameWidth = frameWidth
    this.frameHeight = frameHeight

    this.isPaused = false
    this.punching = false
    this.punchTimer = 0
    this.staticFrameUrl = null

    this.setupElements()
  }

  setupElements() {
    const computedStyle = window.getComputedStyle(this.parent)
    if (computedStyle.position === "static") {
      this.parent.style.position = "relative"
    }

    this.el = document.createElement("img")
    this.el.src = this.spriteUrl
    this.el.style.position = "absolute"
    this.el.style.width = `${this.frameWidth}px`
    this.el.style.height = `${this.frameHeight}px`
    this.el.style.pointerEvents = "none"
    this.el.style.imageRendering = "pixelated"
    this.parent.appendChild(this.el)

    this.captureCanvas = document.createElement("canvas")
    this.captureCanvas.width = this.frameWidth
    this.captureCanvas.height = this.frameHeight
    this.captureCtx = this.captureCanvas.getContext("2d")

    this.el.onload = () => {
      this.captureStaticFrame()
    }
  }

  captureStaticFrame() {
    if (this.el.complete) {
      this.captureCtx.clearRect(0, 0, this.frameWidth, this.frameHeight)
      this.captureCtx.drawImage(this.el, 0, 0, this.frameWidth, this.frameHeight)
      this.staticFrameUrl = this.captureCanvas.toDataURL()
    }
  }

  updateAnimation(walking) {
    if (!this.el) return
    if (this.punching) return

    if (walking) {
      if (this.isPaused) {
        this.el.src = this.spriteUrl + "?t=" + Date.now()
        this.isPaused = false
      }
    } else {
      if (!this.isPaused) {
        this.captureStaticFrame()
        if (this.staticFrameUrl) {
          this.el.src = this.staticFrameUrl
          this.isPaused = true
        }
      }
    }
  }

  startPunch() {
    if (!this.punchUrl) return
    this.punching = true
    this.punchTimer = 1500
    this.el.src = this.punchUrl + "?t=" + Date.now()
  }

  updatePunch(delta, walking) {
    if (!this.punching) return

    this.punchTimer -= delta
    if (this.punchTimer <= 0) {
      this.punching = false
      this.punchTimer = 0

      if (walking) {
        this.el.src = this.spriteUrl + "?t=" + Date.now()
        this.isPaused = false
      } else if (this.staticFrameUrl) {
        this.el.src = this.staticFrameUrl
        this.isPaused = true
      } else {
        this.el.src = this.spriteUrl
        this.isPaused = false
      }
    }
  }

  updatePosition(screenX, screenY, direction, canvasOffsetX, canvasOffsetY) {
    if (!this.el) return

    this.el.style.left = `${canvasOffsetX + screenX}px`
    this.el.style.top = `${canvasOffsetY + screenY}px`
    this.el.style.transform = direction === "left" ? "scaleX(-1)" : "scaleX(1)"
  }

  destroy() {
    if (this.el && this.el.parentNode) {
      this.el.remove()
    }
  }
}
