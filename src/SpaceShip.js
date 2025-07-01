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
            tailLength: 50, // Number of positions to keep for the tail
            tailMaxDistance: 500, // Maximum distance in pixels for the tail
            ...props
        }
        this.ctx = canvas.getContext("2d")
        this.positions = [] // Array to store previous positions for the tail
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

        // Store current position for the tail
        this.positions.unshift({
            x: this.x,
            y: this.y,
            direction: this.direction
        })

        // Limit the number of positions stored
        if (this.positions.length > this.props.tailLength) {
            this.positions.pop()
        }

        // Prevent ship from flying out of the screen by bouncing off edges
        if (this.x < 0) {
            this.x = 0
            // Reflect the direction horizontally (bounce off left edge)
            this.direction = Math.PI - this.direction
        }
        if (this.x > this.canvas.width) {
            this.x = this.canvas.width
            // Reflect the direction horizontally (bounce off right edge)
            this.direction = Math.PI - this.direction
        }
        if (this.y < 0) {
            this.y = 0
            // Reflect the direction vertically (bounce off top edge)
            this.direction = -this.direction
        }
        if (this.y > this.canvas.height) {
            this.y = this.canvas.height
            // Reflect the direction vertically (bounce off bottom edge)
            this.direction = -this.direction
        }

        // Normalize direction to keep it within [0, 2π]
        this.direction = (this.direction + 2 * Math.PI) % (2 * Math.PI)
    }

    draw() {
        this.update()

        // Draw the tail first
        this.drawTail()

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

    drawTail() {
        if (this.positions.length < 2) return;

        // Calculate total distance for opacity scaling
        let totalDistance = 0;
        const distances = [];

        for (let i = 1; i < this.positions.length; i++) {
            const dx = this.positions[i].x - this.positions[i-1].x;
            const dy = this.positions[i].y - this.positions[i-1].y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            distances.push(distance);
            totalDistance += distance;

            // Stop if we've reached the maximum tail distance
            if (totalDistance > this.props.tailMaxDistance) {
                break;
            }
        }

        // Draw the tail segments with decreasing opacity
        let currentDistance = 0;

        for (let i = 1; i < this.positions.length; i++) {
            const prev = this.positions[i-1];
            const current = this.positions[i];

            currentDistance += distances[i-1];

            // Calculate opacity based on distance (1.0 at start, 0.0 at maxDistance)
            const opacity = Math.max(0, 1 - (currentDistance / this.props.tailMaxDistance));

            if (opacity <= 0) break; // Stop drawing if opacity reaches 0

            // Draw a line segment for the tail
            this.ctx.beginPath();
            this.ctx.moveTo(prev.x, prev.y);
            this.ctx.lineTo(current.x, current.y);

            // Use the ship's color with decreasing opacity
            const color = this.props.color;
            this.ctx.strokeStyle = this.getRGBAFromHex(color, opacity);
            this.ctx.lineWidth = this.props.size / 3; // Thinner than the ship
            this.ctx.stroke();

            // Stop if we've reached the maximum tail distance
            if (currentDistance > this.props.tailMaxDistance) {
                break;
            }
        }
    }

    // Helper function to convert hex color to rgba for opacity
    getRGBAFromHex(hex, opacity) {
        // Remove # if present
        hex = hex.replace('#', '');

        // Parse the hex values
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        // Return rgba value
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
}
