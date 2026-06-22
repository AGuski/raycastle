import { CONFIG } from '../../core/config';
import { AssetManager } from '../../engine/assets';
import { Bitmap, Block, BlockSide, BlockSides } from '../block';
import { Sprite } from '../entities/sprite';
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
import floorWoodImg from '../../assets/floor_wood_1.png';
import ceilingWoodImg from '../../assets/wooden_panel_ceiling_1.png';

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
        garrison: this.garrison
      },
      this.boundaryBlock,
      this.entityManager
    );
  }

  get sprites(): Sprite[] {
    return [...this.chunkManager.getStaticSprites(), ...this.entityManager.actors];
  }

  getBitmaps(): Bitmap[] {
    return [
      this.wallImage,
      this.skybox,
      this.lampstand.bitmap,
      this.zombie.bitmap,
      this.garrison.bitmap,
      this.floorTexture,
      this.ceilingTexture,
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

  update(seconds: number, playerX: number, playerY: number): void {
    this.deltaTime += seconds;
    this.chunkManager.updateStreaming(playerX, playerY);
    this.entityManager.update(seconds, { x: playerX, y: playerY }, this);
    this.light = 1;
  }
}
