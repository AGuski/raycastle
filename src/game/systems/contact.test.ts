import { describe, expect, it, vi } from 'vitest';
import { ContactSensor } from '../entities/components/contactSensor';
import { Entity } from '../entities/entity';
import { MAP_EMPTY } from '../../types';
import { resolveContactEvents } from './contact';

const openWorld = {
  getBlock: () => MAP_EMPTY,
  isOpen: () => true
};

describe('resolveContactEvents', () => {
  it('logs when a ContactSensor enters contact with the player', () => {
    const entity = new Entity(1, 0.65);
    entity.add(new ContactSensor());

    entity.update({
      dt: 1,
      time: 0,
      world: openWorld,
      player: {
        x: 1,
        y: 1,
        direction: 0,
        sheathed: false,
        swingProgress: 0,
        swingId: 0
      }
    });

    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    resolveContactEvents([entity]);

    expect(log).toHaveBeenCalledWith('[contact] actor touching player', {
      x: 1,
      y: 0.65
    });
    log.mockRestore();
  });

  it('does not log on sustained contact', () => {
    const entity = new Entity(1, 0.65);
    entity.add(new ContactSensor());
    const player = {
      x: 1,
      y: 1,
      direction: 0,
      sheathed: false,
      swingProgress: 0,
      swingId: 0
    };
    const ctx = { dt: 1, time: 0, world: openWorld, player };

    entity.update(ctx);
    entity.update(ctx);

    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    resolveContactEvents([entity]);

    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
