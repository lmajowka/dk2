export default class PropsRenderer {
  constructor(props, propUrls) {
    this.props = props || []
    this.propImages = {}

    propUrls.forEach((propData) => {
      const img = new Image()
      img.src = propData.url
      this.propImages[propData.id] = img
    })
  }

  draw(ctx, cameraX, cameraY, canvasWidth, canvasHeight) {
    if (this.props.length === 0) return

    this.props.forEach((prop) => {
      const img = this.propImages[prop.id]
      if (!img || !img.complete) return

      const drawX = prop.x - cameraX
      const drawY = prop.y - cameraY

      const propWidth = img.naturalWidth || img.width || 64
      const propHeight = img.naturalHeight || img.height || 64

      if (drawX + propWidth < 0 || drawX > canvasWidth) return
      if (drawY + propHeight < 0 || drawY > canvasHeight) return

      ctx.drawImage(img, drawX, drawY)
    })
  }
}
