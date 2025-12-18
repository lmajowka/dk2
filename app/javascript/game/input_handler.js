export default class InputHandler {
  constructor() {
    this.keys = { left: false, right: false }
    this.direction = "right"
    this.walking = false
    this.jumpRequested = false
    this.punchRequested = false

    this.onKeyDown = this.onKeyDown.bind(this)
    this.onKeyUp = this.onKeyUp.bind(this)
  }

  attach() {
    window.addEventListener("keydown", this.onKeyDown)
    window.addEventListener("keyup", this.onKeyUp)
  }

  detach() {
    window.removeEventListener("keydown", this.onKeyDown)
    window.removeEventListener("keyup", this.onKeyUp)
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
      this.jumpRequested = true
    } else if (e.key === "s" || e.key === "S") {
      this.punchRequested = true
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
    }
  }

  consumeJump() {
    const requested = this.jumpRequested
    this.jumpRequested = false
    return requested
  }

  consumePunch() {
    const requested = this.punchRequested
    this.punchRequested = false
    return requested
  }
}
