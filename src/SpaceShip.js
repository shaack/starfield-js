/**
 * Author and copyright: Stefan Haack (https://shaack.com)
 * Repository: https://github.com/shaack/starfield-js
 * License: MIT, see file 'LICENSE'
 */
export class SpaceShip {
    constructor(canvas, props) {
        this.canvas = canvas
        this.props = {
            speed: 3,
            size: 10,
            color: "#ffffff",
            curveIntensity: 0.02, // How much the ship curves during flight
            curveChangeRate: 0.005, // How often the curve direction changes
            ...props
        }
        this.ctx = canvas.getContext("2d")
        this.init()
    }

    init() {
        // Initialize the spaceship at a random position
        this.x = Math.random() * this.canvas.width
        this.y = Math.random() * this.canvas.height

        // Random initial direction (angle in radians)
        this.direction = Math.random() * Math.PI * 2

        // Current curve value (positive or negative affects curve direction)
        this.curveValue = 0
    }

    update() {
        // Update curve value with some randomness
        if (Math.random() < this.props.curveChangeRate) {
            this.curveValue = (Math.random() - 0.5) * this.props.curveIntensity
        }

        // Update direction based on curve
        this.direction += this.curveValue

        // Update position based on direction and speed
        this.x += Math.cos(this.direction) * this.props.speed
        this.y += Math.sin(this.direction) * this.props.speed

        // Wrap around screen edges
        if (this.x < 0) this.x = this.canvas.width
        if (this.x > this.canvas.width) this.x = 0
        if (this.y < 0) this.y = this.canvas.height
        if (this.y > this.canvas.height) this.y = 0
    }

    draw() {
        this.update()

        // Save the current context state
        this.ctx.save()

        // Move to the ship's position and rotate to its direction
        this.ctx.translate(this.x, this.y)
        this.ctx.rotate(this.direction)

        // Draw the spaceship (a simple triangle)
        this.ctx.fillStyle = this.props.color
        this.ctx.beginPath()
        this.ctx.moveTo(this.props.size, 0)
        this.ctx.lineTo(-this.props.size / 2, -this.props.size / 2)
        this.ctx.lineTo(-this.props.size / 2, this.props.size / 2)
        this.ctx.closePath()
        this.ctx.fill()

        // Restore the context state
        this.ctx.restore()
    }
}
