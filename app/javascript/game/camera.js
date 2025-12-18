export default class Camera {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth
    this.canvasHeight = canvasHeight
    this.x = 0
    this.y = 0
  }

  update(worldX, worldY, levelWidthPx, levelHeightPx) {
    // Horizontal camera
    if (levelWidthPx != null) {
      const maxCameraX = Math.max(0, levelWidthPx - this.canvasWidth)
      const centerX = this.canvasWidth / 2

      const desiredCameraX = worldX - centerX
      if (desiredCameraX > this.x) {
        this.x = Math.min(desiredCameraX, maxCameraX)
      } else if (desiredCameraX < this.x) {
        this.x = Math.max(desiredCameraX, 0)
      }
    }

    // Vertical camera
    const maxCameraY = Math.max(0, levelHeightPx - this.canvasHeight)
    const centerY = this.canvasHeight / 2

    const desiredCameraY = worldY - centerY
    if (desiredCameraY > this.y) {
      this.y = Math.min(desiredCameraY, maxCameraY)
    } else if (desiredCameraY < this.y) {
      this.y = Math.max(desiredCameraY, 0)
    }
  }

  reset() {
    this.x = 0
    this.y = 0
  }

  worldToScreen(worldX, worldY) {
    return {
      x: worldX - this.x,
      y: worldY - this.y,
    }
  }

  getScreenX(worldX, frameWidth) {
    let screenX = worldX - this.x
    if (screenX < 0) screenX = 0
    if (screenX > this.canvasWidth - frameWidth) {
      screenX = this.canvasWidth - frameWidth
    }
    return screenX
  }
}
