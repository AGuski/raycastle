import { Point } from '../../types';
import { ActorEntity, ActorWorld } from '../entities/actorEntity';
import { chunkKey } from './chunk';

export class EntityManager {
  private readonly spawnedChunks = new Set<string>();
  readonly actors: ActorEntity[] = [];

  addChunkActors(cx: number, cy: number, actors: ActorEntity[]): void {
    const key = chunkKey(cx, cy);
    if (this.spawnedChunks.has(key)) return;
    this.spawnedChunks.add(key);
    this.actors.push(...actors);
  }

  update(seconds: number, target: Point, world: ActorWorld): void {
    for (const actor of this.actors) {
      actor.update(seconds, target, world);
    }
  }
}
