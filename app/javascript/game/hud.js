export default class HUD {
  constructor(parent) {
    this.parent = parent
    this.maxHealth = 100
    this.health = 100
    this.lives = 3
    this.maxLives = 3
    this.enemyCount = 0

    this.setupHealthBar()
    this.setupEnemyCounter()
  }

  setupHealthBar() {
    const barContainer = document.createElement("div")
    barContainer.style.position = "absolute"
    barContainer.style.top = "10px"
    barContainer.style.left = "10px"
    barContainer.style.width = "200px"
    barContainer.style.height = "20px"
    barContainer.style.border = "2px solid #000"
    barContainer.style.backgroundColor = "rgba(0, 0, 0, 0.4)"

    const barFill = document.createElement("div")
    barFill.style.height = "100%"
    barFill.style.width = "100%"
    barFill.style.backgroundColor = "#e53935"

    barContainer.appendChild(barFill)
    this.parent.appendChild(barContainer)

    this.healthBarContainer = barContainer
    this.healthBarFill = barFill
  }

  setupEnemyCounter() {
    const counter = document.createElement("div")
    counter.style.position = "absolute"
    counter.style.top = "10px"
    counter.style.right = "10px"
    counter.style.padding = "5px 10px"
    counter.style.backgroundColor = "rgba(0, 0, 0, 0.6)"
    counter.style.color = "#fff"
    counter.style.fontFamily = "Arial, sans-serif"
    counter.style.fontSize = "16px"
    counter.style.fontWeight = "bold"
    counter.style.borderRadius = "4px"

    this.parent.appendChild(counter)
    this.enemyCounterEl = counter
    this.updateEnemyCounter()
  }

  setHealth(health, maxHealth) {
    this.health = health
    this.maxHealth = maxHealth
    this.updateHealthBar()
  }

  setLives(lives, maxLives) {
    this.lives = lives
    this.maxLives = maxLives
  }

  setEnemyCount(count) {
    this.enemyCount = count
    this.updateEnemyCounter()
  }

  updateEnemyCounter() {
    if (!this.enemyCounterEl) return
    this.enemyCounterEl.textContent = `Enemies: ${this.enemyCount}`
  }

  updateHealthBar() {
    if (!this.healthBarFill || !this.maxHealth) return

    const clampedHealth = Math.max(0, Math.min(this.health, this.maxHealth))
    const percent = (clampedHealth / this.maxHealth) * 100
    this.healthBarFill.style.width = `${percent}%`
  }

  drawLevelEndedOverlay(ctx, canvasWidth, canvasHeight, levelEndedTime) {
    const progress = Math.min(levelEndedTime / 500, 1)
    const alpha = progress * 0.7

    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    if (progress >= 0.3) {
      const textProgress = Math.min((levelEndedTime - 150) / 300, 1)
      const scale = 0.5 + textProgress * 0.5
      const textAlpha = textProgress

      ctx.save()
      ctx.translate(canvasWidth / 2, canvasHeight / 2)
      ctx.scale(scale, scale)

      ctx.font = "bold 48px Arial"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      ctx.fillStyle = `rgba(255, 215, 0, ${textAlpha})`
      ctx.fillText("LEVEL ENDED", 0, 0)

      ctx.strokeStyle = `rgba(139, 69, 19, ${textAlpha})`
      ctx.lineWidth = 3
      ctx.strokeText("LEVEL ENDED", 0, 0)

      ctx.restore()
    }
  }

  destroy() {
    if (this.healthBarContainer && this.healthBarContainer.parentNode) {
      this.healthBarContainer.remove()
    }
    if (this.enemyCounterEl && this.enemyCounterEl.parentNode) {
      this.enemyCounterEl.remove()
    }
  }
}
