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
            stuckThreshold: 50, // Number of frames to consider a ship stuck
            stuckEscapeMultiplier: 3.0, // Multiplier for curve intensity when stuck
            cornerDetectionThreshold: 1.5, // Threshold to detect when ship is in a corner

            // Swarm properties
            index: 0, // Index of this ship in the swarm (0-based)
            swarmCount: 1, // Total number of ships in the swarm
            swarmSpread: 0.3, // How far apart the ships are horizontally (0-1)
            swarmOffset: 0.1, // Vertical offset between ships (0-1)

            // Following behavior properties
            followEnabled: true, // Whether ships should follow each other
            followStrength: 0.02, // How strongly a ship follows another (0-1)
            followDistance: 200, // Maximum distance to follow another ship
            followIndex: null, // Index of the ship to follow (null = automatic)
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

        // Initialize edge tracking variables
        this.edgeProximityFrames = {
            left: 0,
            right: 0,
            top: 0,
            bottom: 0
        }
        this.lastPosition = { x: 0, y: 0 }
        this.isStuck = false
        this.stuckFrames = 0

        // Initialize swarm-related properties
        this.swarm = null
        this.targetShip = null

        this.init()
    }

    init() {
        // Calculate the dimensions of the canvas
        const canvasWidth = this.canvas.width
        const canvasHeight = this.canvas.height

        // Calculate the center 50% area of the screen
        // This means 25% from each edge
        const centerXStart = canvasWidth * 0.25
        const centerXEnd = canvasWidth * 0.75
        const centerYStart = canvasHeight * 0.25
        const centerYEnd = canvasHeight * 0.75

        // Calculate the width and height of the center area
        const centerWidth = centerXEnd - centerXStart
        const centerHeight = centerYEnd - centerYStart

        // Position ships randomly within the center 50% area
        // Apply some spread based on index to avoid ships starting at the exact same position
        const indexOffset = (this.props.index / Math.max(1, this.props.swarmCount - 1)) - 0.5
        const spreadFactor = 0.3 // How much to spread ships based on index (0 = no spread, 1 = full spread)

        // Random position within center area with some spread based on index
        this.x = centerXStart + centerWidth * (0.5 + indexOffset * spreadFactor + (Math.random() - 0.5) * (1 - spreadFactor))
        this.y = centerYStart + centerHeight * (0.5 + indexOffset * spreadFactor + (Math.random() - 0.5) * (1 - spreadFactor))

        // Ensure the ship stays within the center area
        this.x = Math.max(centerXStart, Math.min(centerXEnd, this.x))
        this.y = Math.max(centerYStart, Math.min(centerYEnd, this.y))

        // Set a random initial direction (angle in radians between 0 and 2π)
        this.direction = Math.random() * Math.PI * 2

        // Current curve value (positive or negative affects curve direction)
        // Vary the initial curve value based on index to create different flight patterns
        this.curveValue = (this.props.index / this.props.swarmCount - 0.5) * this.props.curveIntensity
    }

    update() {
        // Save the last position to detect if we're stuck
        this.lastPosition = { x: this.x, y: this.y };

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

        // Check if the ship is stuck (minimal movement)
        const movement = Math.sqrt(
            Math.pow(this.x - this.lastPosition.x, 2) +
            Math.pow(this.y - this.lastPosition.y, 2)
        );

        if (movement < this.props.speed * 0.2) {
            this.stuckFrames++;
            if (this.stuckFrames > this.props.stuckThreshold) {
                this.isStuck = true;
            }
        } else {
            // Reset stuck counter if we're moving normally
            this.stuckFrames = Math.max(0, this.stuckFrames - 2); // Decrease faster than it increases
            if (this.stuckFrames === 0) {
                this.isStuck = false;
            }
        }

        // Prevent ship from flying out of the screen by curving away from edges
        // Check distance from each edge and apply curve if needed
        let edgeCurveApplied = false;
        let edgeCount = 0; // Count how many edges we're near (for corner detection)

        // Track which edges we're near
        const nearEdges = {
            left: false,
            right: false,
            top: false,
            bottom: false
        };

        // Left edge
        if (this.x < this.props.edgeDistance) {
            nearEdges.left = true;
            edgeCount++;
            this.edgeProximityFrames.left++;

            // Calculate how close we are to the edge (0 = at edge, 1 = at edgeDistance)
            const distanceFactor = this.x / this.props.edgeDistance;

            // Apply stronger curve as we get closer to the edge
            // Use stuckEscapeMultiplier if we're stuck
            let curveStrength = this.props.edgeCurveIntensity * (1 - distanceFactor);
            if (this.isStuck || this.edgeProximityFrames.left > this.props.stuckThreshold) {
                curveStrength *= this.props.stuckEscapeMultiplier;
            }

            // Determine ideal direction to move away from edge (right = 0)
            // If we're in a corner, adjust the ideal direction to move diagonally away
            let idealDirection = 0;
            if (nearEdges.top) {
                idealDirection = Math.PI / 4; // Down-right (45°)
            } else if (nearEdges.bottom) {
                idealDirection = 7 * Math.PI / 4; // Up-right (315°)
            }

            // Calculate difference between current and ideal direction
            let dirDiff = idealDirection - this.direction;

            // Normalize the difference to be between -π and π
            while (dirDiff > Math.PI) dirDiff -= 2 * Math.PI;
            while (dirDiff < -Math.PI) dirDiff += 2 * Math.PI;

            // Apply curve based on direction difference
            this.direction += curveStrength * Math.sign(dirDiff);
            edgeCurveApplied = true;
        } else {
            // Reset counter if we're not near this edge
            this.edgeProximityFrames.left = 0;
        }

        // Right edge
        if (this.x > this.canvas.width - this.props.edgeDistance) {
            nearEdges.right = true;
            edgeCount++;
            this.edgeProximityFrames.right++;

            const distanceFactor = (this.canvas.width - this.x) / this.props.edgeDistance;

            let curveStrength = this.props.edgeCurveIntensity * (1 - distanceFactor);
            if (this.isStuck || this.edgeProximityFrames.right > this.props.stuckThreshold) {
                curveStrength *= this.props.stuckEscapeMultiplier;
            }

            // Ideal direction to move away from right edge (left = π)
            let idealDirection = Math.PI;
            if (nearEdges.top) {
                idealDirection = 3 * Math.PI / 4; // Down-left (135°)
            } else if (nearEdges.bottom) {
                idealDirection = 5 * Math.PI / 4; // Up-left (225°)
            }

            let dirDiff = idealDirection - this.direction;

            while (dirDiff > Math.PI) dirDiff -= 2 * Math.PI;
            while (dirDiff < -Math.PI) dirDiff += 2 * Math.PI;

            this.direction += curveStrength * Math.sign(dirDiff);
            edgeCurveApplied = true;
        } else {
            this.edgeProximityFrames.right = 0;
        }

        // Top edge
        if (this.y < this.props.edgeDistance) {
            nearEdges.top = true;
            edgeCount++;
            this.edgeProximityFrames.top++;

            const distanceFactor = this.y / this.props.edgeDistance;

            let curveStrength = this.props.edgeCurveIntensity * (1 - distanceFactor);
            if (this.isStuck || this.edgeProximityFrames.top > this.props.stuckThreshold) {
                curveStrength *= this.props.stuckEscapeMultiplier;
            }

            // Ideal direction to move away from top edge (down = π/2)
            let idealDirection = Math.PI / 2;
            if (nearEdges.left) {
                idealDirection = Math.PI / 4; // Down-right (45°)
            } else if (nearEdges.right) {
                idealDirection = 3 * Math.PI / 4; // Down-left (135°)
            }

            let dirDiff = idealDirection - this.direction;

            while (dirDiff > Math.PI) dirDiff -= 2 * Math.PI;
            while (dirDiff < -Math.PI) dirDiff += 2 * Math.PI;

            this.direction += curveStrength * Math.sign(dirDiff);
            edgeCurveApplied = true;
        } else {
            this.edgeProximityFrames.top = 0;
        }

        // Bottom edge
        if (this.y > this.canvas.height - this.props.edgeDistance) {
            nearEdges.bottom = true;
            edgeCount++;
            this.edgeProximityFrames.bottom++;

            const distanceFactor = (this.canvas.height - this.y) / this.props.edgeDistance;

            let curveStrength = this.props.edgeCurveIntensity * (1 - distanceFactor);
            if (this.isStuck || this.edgeProximityFrames.bottom > this.props.stuckThreshold) {
                curveStrength *= this.props.stuckEscapeMultiplier;
            }

            // Ideal direction to move away from bottom edge (up = 3π/2)
            let idealDirection = 3 * Math.PI / 2;
            if (nearEdges.left) {
                idealDirection = 7 * Math.PI / 4; // Up-right (315°)
            } else if (nearEdges.right) {
                idealDirection = 5 * Math.PI / 4; // Up-left (225°)
            }

            let dirDiff = idealDirection - this.direction;

            while (dirDiff > Math.PI) dirDiff -= 2 * Math.PI;
            while (dirDiff < -Math.PI) dirDiff += 2 * Math.PI;

            this.direction += curveStrength * Math.sign(dirDiff);
            edgeCurveApplied = true;
        } else {
            this.edgeProximityFrames.bottom = 0;
        }

        // If we're in a corner (near multiple edges), apply an extra strong correction
        if (edgeCount >= 2) {
            // Add a random jitter to help escape from corners
            this.direction += (Math.random() - 0.5) * 0.2;
        }

        // If we're stuck for too long, apply a more drastic measure
        if (this.isStuck && this.stuckFrames > this.props.stuckThreshold * 2) {
            // Add a significant random change to the direction
            this.direction += (Math.random() - 0.5) * Math.PI;
            // Reset stuck counter to give this correction a chance to work
            this.stuckFrames = this.props.stuckThreshold;
        }

        // Only apply random curve if not near an edge
        if (!edgeCurveApplied) {
            // Apply following behavior if enabled and we have a target ship
            let followingApplied = false;
            if (this.props.followEnabled && this.targetShip) {
                followingApplied = this.applyFollowingBehavior();
            }

            // Apply random curve if not following another ship
            if (!followingApplied) {
                if (Math.random() < this.props.curveChangeRate) {
                    this.curveValue = (Math.random() - 0.5) * this.props.curveIntensity;
                }
                // Apply the random curve to the direction
                this.direction += this.curveValue;
            }

            // Reset all edge proximity counters when we're away from edges
            this.edgeProximityFrames.left = 0;
            this.edgeProximityFrames.right = 0;
            this.edgeProximityFrames.top = 0;
            this.edgeProximityFrames.bottom = 0;
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

    // Set the swarm of ships and determine which one to follow
    setSwarm(swarm) {
        this.swarm = swarm;

        if (!this.props.followEnabled || this.swarm.length <= 1) {
            return; // No following if disabled or only one ship
        }

        // Determine which ship to follow
        if (this.props.followIndex !== null) {
            // Use specified index if provided
            const followIndex = this.props.followIndex % this.swarm.length;
            if (followIndex !== this.props.index) { // Don't follow yourself
                this.targetShip = this.swarm[followIndex];
            }
        } else {
            // By default, follow the next ship in the sequence (circular)
            const nextIndex = (this.props.index + 1) % this.swarm.length;
            this.targetShip = this.swarm[nextIndex];
        }
    }

    // Calculate and apply direction adjustment to follow the target ship
    applyFollowingBehavior() {
        if (!this.targetShip) {
            return false;
        }

        // Calculate distance to target ship
        const dx = this.targetShip.x - this.x;
        const dy = this.targetShip.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Only follow if within the follow distance
        if (distance > this.props.followDistance) {
            return false;
        }

        // Calculate direction to target ship
        const targetDirection = Math.atan2(dy, dx);

        // Calculate the difference between current and target direction
        let dirDiff = targetDirection - this.direction;

        // Normalize the difference to be between -π and π
        while (dirDiff > Math.PI) dirDiff -= 2 * Math.PI;
        while (dirDiff < -Math.PI) dirDiff += 2 * Math.PI;

        // Apply direction adjustment based on follow strength
        // Stronger effect when closer to the target ship
        const distanceFactor = 1 - (distance / this.props.followDistance);
        const adjustmentStrength = this.props.followStrength * distanceFactor;

        // Apply the adjustment to the direction
        this.direction += dirDiff * adjustmentStrength;

        return true;
    }
}
