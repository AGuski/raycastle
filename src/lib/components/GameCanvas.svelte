<script lang="ts">
	import { onMount } from 'svelte';
	import '../style.css';
	import { startGame } from '../main';
	import ExperimentalMenu from './ExperimentalMenu.svelte';

	let canvas: HTMLCanvasElement;

	onMount(() => {
		startGame(canvas).catch((err) => {
			console.error('Failed to start game', err);
		});
	});
</script>

<canvas id="display" width="1" height="1" bind:this={canvas}></canvas>
<ExperimentalMenu />
