import { CONFIG } from '../../core/config';
import { AssetManager } from '../../engine/assets';
import { Bitmap, Block, BlockSide, BlockSides } from '../block';
import { PlayerView } from '../entities/component';
import { Entity } from '../entities/entity';
import { decalsFromCellEntities } from '../entities/decalsFromEntities';
import { spritesFromEntities } from '../entities/spritesFromEntities';
import { Decal } from '../decal';
import { Sprite } from '../entities/sprite';
import { runSystems } from '../systems/runSystems';
import { spriteSheet, SpriteSheet } from '../spriteSheet';
import { isOpenCell, MapCell } from '../../types';
import { ChunkManager } from './chunkManager';
import { EntityManager } from './entityManager';
import { LevelRecipe, loadLevelRecipe } from './levelRecipe';
import wallBooksImg from '../../assets/wall_stone_wood_books_large.png';
import wallFireAnimImg from '../../assets/wall_stone_wood_fire_anim_large.png';
import wallNofireImg from '../../assets/wall_stone_wood_nofire_1_large.png';
import wallPaintingImg from '../../assets/wall_stone_wood_painting_1_large.png';
import wallControlsImg from '../../assets/wall_stone_wood_controls_large.png';
import skyboxImg from '../../assets/skybox.png';
import lampstandImg from '../../assets/lampstand_1_large.png';
import zombieImg from '../../assets/Zombie_Test_Sprite.png';
import garrisonImg from '../../assets/mr-garrison.png';
import hunterLichImg from '../../assets/hunter_lich_1.png';
import floorWoodImg from '../../assets/floor_wood_1.png';
import ceilingWoodImg from '../../assets/wooden_panel_ceiling_1.png';
import wallCracksImg from '../../assets/wall_cracks_decal_1.png';

export { loadLevelRecipe };

export class World {
  private readonly chunkManager: ChunkManager;
  private readonly entityManager: EntityManager;

  public readonly skybox: Bitmap;
  public readonly floorTexture: Bitmap;
  public readonly ceilingTexture: Bitmap;
  public light: number;
  public deltaTime = 0;

  readonly wallImage: Bitmap;
  private readonly wallSheet: SpriteSheet;
  private readonly lampstand: SpriteSheet;
  private readonly zombie: SpriteSheet;
  private readonly garrison: SpriteSheet;
  private readonly hunterLich: SpriteSheet;
  private readonly crackDecal: SpriteSheet;
  private readonly paintings: BlockSide[];
  private readonly boundaryBlock: Block;

  constructor(
    recipe: LevelRecipe,
    assets: AssetManager
  ) {
    const { textures } = CONFIG;
    this.wallImage = assets.createBitmap(
      wallBooksImg,
      textures.wallBooks.width,
      textures.wallBooks.height
    );
    this.wallSheet = spriteSheet(this.wallImage);
    this.paintings = [
      {
        texture: spriteSheet(
          assets.createBitmap(
            wallFireAnimImg,
            textures.wallFireAnim.width,
            textures.wallFireAnim.height
          ),
          textures.wallFireAnim.frames
        )
      },
      {
        texture: spriteSheet(
          assets.createBitmap(
            wallNofireImg,
            textures.wallNofire.width,
            textures.wallNofire.height
          )
        )
      },
      {
        texture: spriteSheet(
          assets.createBitmap(
            wallPaintingImg,
            textures.wallPainting.width,
            textures.wallPainting.height
          )
        )
      },
      {
        texture: spriteSheet(
          assets.createBitmap(
            wallControlsImg,
            textures.wallControls.width,
            textures.wallControls.height
          )
        )
      }
    ];
    this.skybox = assets.createBitmap(
      skyboxImg,
      textures.skybox.width,
      textures.skybox.height
    );
    this.lampstand = spriteSheet(
      assets.createBitmap(
        lampstandImg,
        textures.lampstand.width,
        textures.lampstand.height
      )
    );
    this.zombie = spriteSheet(
      assets.createBitmap(
        zombieImg,
        textures.zombie.width,
        textures.zombie.height
      ),
      textures.zombie.frames
    );
    this.garrison = spriteSheet(
      assets.createBitmap(
        garrisonImg,
        textures.garrison.width,
        textures.garrison.height
      )
    );
    this.hunterLich = spriteSheet(
      assets.createBitmap(
        hunterLichImg,
        textures.hunterLich.width,
        textures.hunterLich.height
      )
    );
    this.crackDecal = spriteSheet(
      assets.createBitmap(
        wallCracksImg,
        textures.wallCracksDecal.width,
        textures.wallCracksDecal.height
      )
    );
    this.floorTexture = assets.createBitmap(
      floorWoodImg,
      textures.floorWood.width,
      textures.floorWood.height
    );
    this.ceilingTexture = assets.createBitmap(
      ceilingWoodImg,
      textures.ceilingWood.width,
      textures.ceilingWood.height
    );
    this.light = 0;

    const boundarySides: BlockSides = [
      { texture: this.wallSheet },
      { texture: this.wallSheet },
      { texture: this.wallSheet },
      { texture: this.wallSheet }
    ];
    this.boundaryBlock = new Block(boundarySides);
    this.entityManager = new EntityManager();

    this.chunkManager = new ChunkManager(
      recipe,
      {
        wallImage: this.wallSheet,
        paintings: this.paintings,
        lampstand: this.lampstand,
        zombie: this.zombie,
        garrison: this.garrison,
        hunterLich: this.hunterLich
      },
      this.boundaryBlock,
      this.entityManager
    );
  }

  get decals(): Decal[] {
    return decalsFromCellEntities(
      this.chunkManager.getCellEntities(),
      this.crackDecal
    );
  }

  get sprites(): Sprite[] {
    return spritesFromEntities([
      ...this.chunkManager.getStaticEntities(),
      ...this.entityManager.entities
    ]);
  }

  get entities(): readonly Entity[] {
    return this.entityManager.entities;
  }

  getBitmaps(): Bitmap[] {
    return [
      this.wallImage,
      this.skybox,
      this.lampstand.bitmap,
      this.zombie.bitmap,
      this.garrison.bitmap,
      this.hunterLich.bitmap,
      this.floorTexture,
      this.ceilingTexture,
      this.crackDecal.bitmap,
      ...this.paintings
        .map((p) => p.texture?.bitmap)
        .filter((t): t is Bitmap => !!t)
    ];
  }

  findSafeSpawn(): { x: number; y: number; direction: number } {
    return this.chunkManager.findSafeSpawn();
  }

  ensureAround(x: number, y: number, spawnExclude?: { x: number; y: number }): void {
    this.chunkManager.ensureAround(x, y, spawnExclude);
  }

  isOpen(x: number, y: number): boolean {
    return isOpenCell(this.getBlock(x, y));
  }

  getBlock(x: number, y: number): MapCell {
    return this.chunkManager.getCell(x, y);
  }

  setCell(wx: number, wy: number, cell: MapCell): void {
    this.chunkManager.setCell(wx, wy, cell);
  }

  removeCellEntity(entity: Entity): void {
    this.chunkManager.removeCellEntity(entity);
  }

  update(seconds: number, player: PlayerView): void {
    this.deltaTime += seconds;
    this.chunkManager.updateStreaming(player.x, player.y);
    this.chunkManager.updateCellEntities(seconds, player, this);
    this.entityManager.update(seconds, player, this);
    this.light = 1;
  }

  /** Cross-entity systems (contact, weapon strike). Call after player input is applied. */
  runSystems(player: PlayerView): void {
    runSystems(
      {
        dt: 0,
        time: this.deltaTime,
        world: this,
        player
      },
      [...this.entityManager.entities, ...this.chunkManager.getCellEntities()]
    );
  }
}
