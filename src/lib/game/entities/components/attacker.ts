import { CONFIG } from '../../../core/config';
import { rollDamage } from '../../combat/damageRoll';
import { Component, ComponentContext } from '../component';
import { Entity } from '../entity';
import { ContactSensor } from './contactSensor';
import { Damageable } from './damageable';

export interface AttackerConfig {
  damage: number;
  attackInterval: number;
  damageLuck?: number;
}

/** Deals contact damage to the player on a cooldown while touching. */
export class Attacker implements Component {
  private entity!: Entity;
  private _cooldown = 0;

  constructor(private readonly config: AttackerConfig) {}

  onAttach(entity: Entity): void {
    this.entity = entity;
  }

  update(ctx: ComponentContext): void {
    const damageable = this.entity.get(Damageable);
    if (damageable && !damageable.isAlive) return;

    const sensor = this.entity.get(ContactSensor);
    if (!sensor?.inContact) return;

    this._cooldown -= ctx.dt;
    if (this._cooldown > 0) return;

    this._cooldown = this.config.attackInterval;
    const luck =
      this.config.damageLuck ?? CONFIG.combat.defaultDamageLuck;
    const amount = rollDamage(this.config.damage, luck);
    ctx.world.damagePlayer?.(amount);
  }
}
