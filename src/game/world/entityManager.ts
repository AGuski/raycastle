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
      const wasInContact = actor.inContact;
      actor.update(seconds, target, world);
      if (actor.inContact && !wasInContact) {
        console.log('[contact] actor touching player', {
          x: actor.x,
          y: actor.y
        });
      }
    }
  }
}
