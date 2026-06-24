<script lang="ts">
	import { onMount } from 'svelte';
	import { hudState } from '../game/hudState';

	let health = $state(hudState.health);
	let maxHealth = $state(hudState.maxHealth);

	onMount(() => {
		let frame = 0;
		const tick = () => {
			health = hudState.health;
			maxHealth = hudState.maxHealth;
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	});
</script>

<div class="hud" aria-live="polite">
	HP: {Math.round(health)} / {maxHealth}
</div>

<style>
	.hud {
		position: fixed;
		bottom: 12px;
		left: 12px;
		z-index: 20;
		padding: 6px 10px;
		font:
			600 14px/1.2 ui-monospace,
			SFMono-Regular,
			Menlo,
			Consolas,
			monospace;
		color: rgba(255, 230, 210, 0.95);
		background: rgba(8, 4, 2, 0.55);
		border: 1px solid rgba(180, 90, 40, 0.35);
		border-radius: 4px;
		pointer-events: none;
		user-select: none;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
	}
</style>
