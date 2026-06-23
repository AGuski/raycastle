<script lang="ts">
	import { onMount } from 'svelte';
	import {
		hashSeed,
		randomDefaultSeed,
		sampleArea,
		Tile,
		type AreaSample,
		type EntityKind
	} from '$lib/worldgen';
	import { CONFIG } from '$lib/core/config';
	import { defaultGeneratorParams } from '$lib/game/world/levelRecipe';

	const CANVAS_SIZE = 640;
	const PAINTING_VARIANT_COUNT = 4;

	// Spawn is read client-side from game config and passed into the (config-free)
	// worldgen layer.
	const spawnWx = Math.floor(CONFIG.playerStart.x);
	const spawnWy = Math.floor(CONFIG.playerStart.y);

	let seedText = $state('123456789012345');
	let centerWx = $state(spawnWx);
	let centerWy = $state(spawnWy);
	let radiusTiles = $state(24);

	let canvas: HTMLCanvasElement;

	const ENTITY_COLORS: Record<EntityKind, string> = {
		lamp: '#ffd24a',
		zombie: '#5fd35f',
		garrison: '#4aa3ff',
		hunterLich: '#c77dff',
		hiddenDoor: '#ff5d5d'
	};

	const ENTITY_LABELS: Record<EntityKind, string> = {
		lamp: 'Lamp',
		zombie: 'Zombie',
		garrison: 'Garrison',
		hunterLich: 'Hunter Lich',
		hiddenDoor: 'Hidden Door'
	};

	function params() {
		return { ...defaultGeneratorParams(), paintingVariantCount: PAINTING_VARIANT_COUNT };
	}

	function randomize() {
		seedText = randomDefaultSeed();
	}

	function recenterOnSpawn() {
		centerWx = spawnWx;
		centerWy = spawnWy;
	}

	function draw() {
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const radius = Math.max(1, Math.round(radiusTiles));
		const span = 2 * radius + 1;
		const tilePx = CANVAS_SIZE / span;
		const worldSeed = hashSeed(seedText.trim() || '0');

		const sample: AreaSample = sampleArea(
			worldSeed,
			params(),
			Math.round(centerWx),
			Math.round(centerWy),
			radius
		);

		const originWx = Math.round(centerWx) - radius;
		const originWy = Math.round(centerWy) - radius;

		ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

		// Tiles.
		for (let dy = 0; dy < span; dy++) {
			for (let dx = 0; dx < span; dx++) {
				const wx = originWx + dx;
				const wy = originWy + dy;
				const t = sample.tileAt(wx, wy);
				ctx.fillStyle = t === Tile.Wall ? '#2c2438' : '#0d1117';
				ctx.fillRect(dx * tilePx, dy * tilePx, Math.ceil(tilePx), Math.ceil(tilePx));
			}
		}

		// Subtle grid for small zoom levels.
		if (tilePx >= 6) {
			ctx.strokeStyle = 'rgba(255,255,255,0.05)';
			ctx.lineWidth = 1;
			for (let i = 0; i <= span; i++) {
				const p = Math.round(i * tilePx) + 0.5;
				ctx.beginPath();
				ctx.moveTo(p, 0);
				ctx.lineTo(p, CANVAS_SIZE);
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(0, p);
				ctx.lineTo(CANVAS_SIZE, p);
				ctx.stroke();
			}
		}

		// Entities as dots.
		const dot = Math.max(2, tilePx * 0.32);
		for (const e of sample.entities) {
			const cx = (e.wx - originWx) * tilePx;
			const cy = (e.wy - originWy) * tilePx;
			ctx.fillStyle = ENTITY_COLORS[e.kind];
			ctx.beginPath();
			ctx.arc(cx, cy, dot, 0, Math.PI * 2);
			ctx.fill();
		}

		// Mark the center.
		const ccx = (Math.round(centerWx) + 0.5 - originWx) * tilePx;
		const ccy = (Math.round(centerWy) + 0.5 - originWy) * tilePx;
		ctx.strokeStyle = '#ffffff';
		ctx.lineWidth = 2;
		const r = Math.max(5, tilePx * 0.4);
		ctx.beginPath();
		ctx.moveTo(ccx - r, ccy);
		ctx.lineTo(ccx + r, ccy);
		ctx.moveTo(ccx, ccy - r);
		ctx.lineTo(ccx, ccy + r);
		ctx.stroke();
	}

	// Redraw whenever any input changes.
	$effect(() => {
		// Touch reactive deps so the effect re-runs.
		void seedText;
		void centerWx;
		void centerWy;
		void radiusTiles;
		draw();
	});

	onMount(() => {
		draw();
	});
</script>

<svelte:head>
	<title>Ray Castle — World Inspector</title>
</svelte:head>

<main class="admin">
	<h1>World Inspector</h1>

	<div class="layout">
		<section class="controls">
			<label>
				Seed
				<input type="text" bind:value={seedText} spellcheck="false" />
			</label>
			<button type="button" onclick={randomize}>Random seed</button>

			<label>
				Center X
				<input type="number" bind:value={centerWx} step="1" />
			</label>
			<label>
				Center Y
				<input type="number" bind:value={centerWy} step="1" />
			</label>
			<button type="button" onclick={recenterOnSpawn}>Center on spawn</button>

			<label>
				Zoom (radius {Math.round(radiusTiles)} tiles)
				<input type="range" min="4" max="64" step="1" bind:value={radiusTiles} />
			</label>

			<div class="legend">
				<h2>Legend</h2>
				{#each Object.keys(ENTITY_COLORS) as EntityKind[] as kind (kind)}
					<div class="legend-row">
						<span class="swatch" style="background:{ENTITY_COLORS[kind]}"></span>
						{ENTITY_LABELS[kind]}
					</div>
				{/each}
				<div class="legend-row">
					<span class="swatch" style="background:#2c2438"></span>Wall
				</div>
				<div class="legend-row">
					<span class="swatch" style="background:#0d1117; border:1px solid #333"></span>Open
				</div>
			</div>
		</section>

		<canvas bind:this={canvas} width={CANVAS_SIZE} height={CANVAS_SIZE}></canvas>
	</div>
</main>

<style>
	.admin {
		font-family: system-ui, sans-serif;
		color: #e6e6e6;
		background: #0a0a0f;
		min-height: 100vh;
		padding: 1.5rem;
		box-sizing: border-box;
	}
	h1 {
		margin: 0 0 1rem;
		font-size: 1.4rem;
	}
	.layout {
		display: flex;
		gap: 1.5rem;
		align-items: flex-start;
		flex-wrap: wrap;
	}
	.controls {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 240px;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.85rem;
	}
	input[type='text'],
	input[type='number'] {
		background: #16161f;
		border: 1px solid #333;
		color: #e6e6e6;
		padding: 0.4rem 0.5rem;
		border-radius: 4px;
		font: inherit;
	}
	button {
		background: #2c2438;
		color: #e6e6e6;
		border: 1px solid #443a55;
		padding: 0.45rem 0.6rem;
		border-radius: 4px;
		cursor: pointer;
		font: inherit;
	}
	button:hover {
		background: #3a3049;
	}
	canvas {
		border: 1px solid #333;
		image-rendering: pixelated;
		background: #000;
	}
	.legend {
		margin-top: 0.5rem;
		font-size: 0.8rem;
	}
	.legend h2 {
		font-size: 0.9rem;
		margin: 0 0 0.4rem;
	}
	.legend-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.25rem;
	}
	.swatch {
		width: 14px;
		height: 14px;
		border-radius: 3px;
		display: inline-block;
	}
</style>
