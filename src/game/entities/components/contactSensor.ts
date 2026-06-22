import { contactDetectRadius, distanceBetween, isInContact } from '../../contact';
import { Point } from '../../../types';
import { Component, ComponentContext } from '../component';
import { Entity } from '../entity';

/** Tracks player contact and optional proximity queries. */
export class ContactSensor implements Component {
  private entity!: Entity;
  private _inContact = false;
  private _enteredThisFrame = false;

  constructor(private readonly proximityRadius = 0) {}

  /** Whether this entity is currently touching the player. */
  get inContact(): boolean {
    return this._inContact;
  }

  /** True for one frame when contact begins. Read by the contact system. */
  get enteredContact(): boolean {
    return this._enteredThisFrame;
  }

  onAttach(entity: Entity): void {
    this.entity = entity;
  }

  isNear(point: Point): boolean {
    if (this.proximityRadius <= 0) return false;
    return distanceBetween(this.entity, point) <= this.proximityRadius;
  }

  update(ctx: ComponentContext): void {
    const wasInContact = this._inContact;
    this._inContact = isInContact(
      this.entity,
      ctx.player,
      contactDetectRadius()
    );
    this._enteredThisFrame = this._inContact && !wasInContact;
  }
}
