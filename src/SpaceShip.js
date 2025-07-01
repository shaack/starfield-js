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
            tailStartColor: null, // If null, will use the ship color
            tailEndColor: null, // If null, will use the tailStartColor
            curveIntensity: 0.02, // How much the ship curves during flight
            curveChangeRate: 0.005, // How often the curve direction changes
            tailLength: 50, // Number of positions to keep for the tail
            tailMaxDistance: 500, // Maximum distance in pixels for the tail
            tailOpacity: 1.0, // Base opacity of the tail (0.0 to 1.0)
            edgeDistance: 100, // Distance from edge to start turning
            edgeCurveIntensity: 0.05, // How strongly to curve when approaching an edge

            // Swarm properties
            index: 0, // Index of this ship in the swarm (0-based)
            swarmCount: 1, // Total number of ships in the swarm
            swarmSpread: 0.3, // How far apart the ships are horizontally (0-1)
            swarmOffset: 0.1, // Vertical offset between ships (0-1)
            ...props
        }

        // If tailStartColor is not specified, use the ship color
        if (!this.props.tailStartColor) {
            this.props.tailStartColor = this.props.color
        }

        // If tailEndColor is not specified, use the tailStartColor
        if (!this.props.tailEndColor) {
            this.props.tailEndColor = this.props.tailStartColor
        }
        this.ctx = canvas.getContext("2d")
        this.positions = [] // Array to store previous positions for the tail
        this.init()
    }

    init() {
        // Calculate position based on index in the swarm
        const canvasWidth = this.canvas.width
        const canvasHeight = this.canvas.height

        // Calculate horizontal spread based on index
        // Center ship (index 1 in a 3-ship swarm) will be in the middle
        // Other ships will be spread out based on swarmSpread
        const normalizedIndex = this.props.index - (this.props.swarmCount - 1) / 2
        const horizontalPosition = 0.5 + normalizedIndex * this.props.swarmSpread

        // Apply some randomness to make it look more natural
        const randomOffset = (Math.random() - 0.5) * 0.1

        // Calculate x position (constrained to be within the canvas)
        this.x = Math.max(this.props.edgeDistance,
                 Math.min(canvasWidth - this.props.edgeDistance,
                         canvasWidth * (horizontalPosition + randomOffset)))

        // Calculate y position with vertical offset based on index
        // All ships start from the bottom, but with slight vertical offsets
        const verticalOffset = this.props.index * this.props.swarmOffset * canvasHeight
        this.y = canvasHeight - this.props.edgeDistance - verticalOffset

        // Set initial direction to upward (3π/2 or 270 degrees in radians)
        // Add a small random variation to each ship's direction
        const directionVariation = (Math.random() - 0.5) * 0.2
        this.direction = 3 * Math.PI / 2 + directionVariation

        // Current curve value (positive or negative affects curve direction)
        // Vary the initial curve value based on index to create different flight patterns
        this.curveValue = (this.props.index / this.props.swarmCount - 0.5) * this.props.curveIntensity
    }

    update() {
        // We'll handle curve value update in the edge detection code

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

        // Prevent ship from flying out of the screen by curving away from edges
        // Check distance from each edge and apply curve if needed
        let edgeCurveApplied = false;

        // Left edge
        if (this.x < this.props.edgeDistance) {
            // Calculate how close we are to the edge (0 = at edge, 1 = at edgeDistance)
            const distanceFactor = this.x / this.props.edgeDistance;
            // Apply stronger curve as we get closer to the edge
            const curveStrength = this.props.edgeCurveIntensity * (1 - distanceFactor);

            // Determine ideal direction to move away from edge (right = 0)
            const idealDirection = 0;
            // Calculate difference between current and ideal direction
            let dirDiff = idealDirection - this.direction;

            // Normalize the difference to be between -π and π
            while (dirDiff > Math.PI) dirDiff -= 2 * Math.PI;
            while (dirDiff < -Math.PI) dirDiff += 2 * Math.PI;

            // Apply curve based on direction difference
            this.direction += curveStrength * Math.sign(dirDiff);
            edgeCurveApplied = true;
        }

        // Right edge
        if (this.x > this.canvas.width - this.props.edgeDistance) {
            const distanceFactor = (this.canvas.width - this.x) / this.props.edgeDistance;
            const curveStrength = this.props.edgeCurveIntensity * (1 - distanceFactor);

            // Ideal direction to move away from right edge (left = π)
            const idealDirection = Math.PI;
            let dirDiff = idealDirection - this.direction;

            while (dirDiff > Math.PI) dirDiff -= 2 * Math.PI;
            while (dirDiff < -Math.PI) dirDiff += 2 * Math.PI;

            this.direction += curveStrength * Math.sign(dirDiff);
            edgeCurveApplied = true;
        }

        // Top edge
        if (this.y < this.props.edgeDistance) {
            const distanceFactor = this.y / this.props.edgeDistance;
            const curveStrength = this.props.edgeCurveIntensity * (1 - distanceFactor);

            // Ideal direction to move away from top edge (down = π/2)
            const idealDirection = Math.PI / 2;
            let dirDiff = idealDirection - this.direction;

            while (dirDiff > Math.PI) dirDiff -= 2 * Math.PI;
            while (dirDiff < -Math.PI) dirDiff += 2 * Math.PI;

            this.direction += curveStrength * Math.sign(dirDiff);
            edgeCurveApplied = true;
        }

        // Bottom edge
        if (this.y > this.canvas.height - this.props.edgeDistance) {
            const distanceFactor = (this.canvas.height - this.y) / this.props.edgeDistance;
            const curveStrength = this.props.edgeCurveIntensity * (1 - distanceFactor);

            // Ideal direction to move away from bottom edge (up = 3π/2)
            const idealDirection = 3 * Math.PI / 2;
            let dirDiff = idealDirection - this.direction;

            while (dirDiff > Math.PI) dirDiff -= 2 * Math.PI;
            while (dirDiff < -Math.PI) dirDiff += 2 * Math.PI;

            this.direction += curveStrength * Math.sign(dirDiff);
            edgeCurveApplied = true;
        }

        // Only apply random curve if not near an edge
        if (!edgeCurveApplied) {
            if (Math.random() < this.props.curveChangeRate) {
                this.curveValue = (Math.random() - 0.5) * this.props.curveIntensity;
            }
            // Apply the random curve to the direction
            this.direction += this.curveValue;
        }

        // Hard limits to prevent going off-screen in case curve fails
        if (this.x < 0) this.x = 0;
        if (this.x > this.canvas.width) this.x = this.canvas.width;
        if (this.y < 0) this.y = 0;
        if (this.y > this.canvas.height) this.y = this.canvas.height;

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

            // Calculate opacity based on distance and tailOpacity
            // (tailOpacity at start, 0.0 at maxDistance)
            const opacity = Math.max(0, this.props.tailOpacity * (1 - (currentDistance / this.props.tailMaxDistance)));

            if (opacity <= 0) break; // Stop drawing if opacity reaches 0

            // Draw a line segment for the tail
            this.ctx.beginPath();
            this.ctx.moveTo(prev.x, prev.y);
            this.ctx.lineTo(current.x, current.y);

            // Interpolate between start and end tail colors based on distance
            // Factor is 0 at the start of the tail (closest to ship) and 1 at 25% of the tail length
            const colorFactor = Math.min(1.0, currentDistance / (this.props.tailMaxDistance * 0.25));
            const interpolatedColor = this.interpolateColors(this.props.tailStartColor, this.props.tailEndColor, colorFactor);
            this.ctx.strokeStyle = this.getRGBAFromHex(interpolatedColor, opacity);
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

    // Helper function to interpolate between two hex colors
    interpolateColors(color1, color2, factor) {
        // Remove # if present
        color1 = color1.replace('#', '');
        color2 = color2.replace('#', '');

        // Parse the hex values
        const r1 = parseInt(color1.substring(0, 2), 16);
        const g1 = parseInt(color1.substring(2, 4), 16);
        const b1 = parseInt(color1.substring(4, 6), 16);

        const r2 = parseInt(color2.substring(0, 2), 16);
        const g2 = parseInt(color2.substring(2, 4), 16);
        const b2 = parseInt(color2.substring(4, 6), 16);

        // Interpolate the RGB values
        const r = Math.round(r1 + factor * (r2 - r1));
        const g = Math.round(g1 + factor * (g2 - g1));
        const b = Math.round(b1 + factor * (b2 - b1));

        // Convert back to hex
        const rHex = r.toString(16).padStart(2, '0');
        const gHex = g.toString(16).padStart(2, '0');
        const bHex = b.toString(16).padStart(2, '0');

        return `#${rHex}${gHex}${bHex}`;
    }
}
