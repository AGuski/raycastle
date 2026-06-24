<script lang="ts">
	import { experimental, type ExperimentalFlags } from '../core/experimental';

	let open = $state(false);
	// Local mirror so checkboxes stay reactive; writes flow through to the
	// singleton that the render passes poll each frame.
	let flags = $state<ExperimentalFlags>({ ...experimental });

	function toggle(key: keyof ExperimentalFlags, value: boolean) {
		flags[key] = value;
		experimental[key] = value;
	}

	const items: { key: keyof ExperimentalFlags; label: string }[] = [
		{ key: 'volumetricSprites', label: 'Volumetric sprites' },
		{ key: 'volumetricWeapon', label: 'Volumetric weapon' }
	];
</script>

<div class="experimental">
	<button class="tab" onclick={() => (open = !open)} title="Experimental rendering toggles">
		⚗ {open ? '▾' : '▸'}
	</button>
	{#if open}
		<div class="panel">
			<div class="heading">Experiments</div>
			{#each items as item (item.key)}
				<label>
					<input
						type="checkbox"
						checked={flags[item.key]}
						onchange={(e) => toggle(item.key, e.currentTarget.checked)}
					/>
					{item.label}
				</label>
			{/each}
			<div class="hint">Press Esc to free the cursor, then click.</div>
		</div>
	{/if}
</div>

<style>
	.experimental {
		position: fixed;
		top: 8px;
		right: 8px;
		z-index: 1000;
		font-family: ui-monospace, monospace;
		font-size: 12px;
		color: #e6e6e6;
		user-select: none;
	}

	.tab {
		background: rgba(20, 18, 28, 0.8);
		border: 1px solid rgba(140, 130, 170, 0.4);
		border-radius: 4px;
		color: #d8d2e8;
		padding: 4px 8px;
		cursor: pointer;
	}

	.tab:hover {
		background: rgba(40, 36, 54, 0.9);
	}

	.panel {
		margin-top: 6px;
		background: rgba(20, 18, 28, 0.92);
		border: 1px solid rgba(140, 130, 170, 0.4);
		border-radius: 6px;
		padding: 8px 10px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 160px;
	}

	.heading {
		font-weight: bold;
		opacity: 0.7;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-size: 10px;
	}

	label {
		display: flex;
		align-items: center;
		gap: 6px;
		cursor: pointer;
	}

	.hint {
		opacity: 0.5;
		font-size: 10px;
		margin-top: 2px;
	}
</style>
