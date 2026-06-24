import { PlayerView, GameWorld } from '../entities/component';
import { Entity } from '../entities/entity';
import { chunkKey } from './chunk';

export class EntityManager {
  private readonly spawnedChunks = new Set<string>();
  readonly entities: Entity[] = [];

  addChunkEntities(cx: number, cy: number, entities: Entity[]): void {
    const key = chunkKey(cx, cy);
    if (this.spawnedChunks.has(key)) return;
    this.spawnedChunks.add(key);
    this.entities.push(...entities);
  }

  remove(entity: Entity): void {
    const index = this.entities.indexOf(entity);
    if (index === -1) return;
    this.entities.splice(index, 1);
    entity.dispose();
  }

  update(seconds: number, player: PlayerView, world: GameWorld & { deltaTime: number }): void {
    const ctx = {
      dt: seconds,
      time: world.deltaTime,
      world,
      player
    };

    for (const entity of this.entities) {
      entity.update(ctx);
    }
  }
}
