export default class PlayerState {
  constructor(options = {}) {
    this.maxLives = options.maxLives || 3
    this.maxHealth = options.maxHealth || 100
    this.lives = this.maxLives
    this.health = this.maxHealth

    this.damageImmune = false
    this.damageImmuneTimer = 0
    this.damageImmuneDuration = 2000
  }

  takeDamage(amount) {
    if (amount <= 0) return false
    if (this.damageImmune) return false

    this.health -= amount
    this.damageImmune = true
    this.damageImmuneTimer = this.damageImmuneDuration

    if (this.health <= 0) {
      this.health = 0
      return true // died
    }

    return false
  }

  updateImmunity(delta) {
    if (this.damageImmune && this.damageImmuneTimer > 0) {
      this.damageImmuneTimer -= delta
      if (this.damageImmuneTimer <= 0) {
        this.damageImmune = false
        this.damageImmuneTimer = 0
      }
    }
  }

  loseLife() {
    this.lives -= 1
    if (this.lives <= 0) {
      this.lives = this.maxLives
    }
    this.health = this.maxHealth
    this.damageImmune = false
    this.damageImmuneTimer = 0
  }

  reset() {
    this.lives = this.maxLives
    this.health = this.maxHealth
    this.damageImmune = false
    this.damageImmuneTimer = 0
  }
}
