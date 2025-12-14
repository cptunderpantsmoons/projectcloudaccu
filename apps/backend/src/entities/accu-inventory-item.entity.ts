import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { Project } from './project.entity';

export enum InventoryStatus {
  HELD = 'held',
  TRADED = 'traded',
  RETIRED = 'retired',
  RESERVED = 'reserved',
}

@Entity('accu_inventory')
@Index(['status'])
@Index(['projectId'])
@Index(['vintage'])
export class AccuInventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  accuType: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  quantity: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  availableQuantity: number;

  @Column()
  vintage: number;

  @Column({
    type: 'enum',
    enum: InventoryStatus,
    default: InventoryStatus.HELD,
  })
  status: InventoryStatus;

  @Column({ nullable: true })
  certificateUrl: string;

  @Column({ type: 'timestamp' })
  acquisitionDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  acquisitionCost: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  tenantId: string;

  @ManyToOne(() => Project, (project) => project.accuInventory)
  project: Project;

  @Column()
  projectId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  isHeld(): boolean {
    return this.status === InventoryStatus.HELD;
  }

  isTraded(): boolean {
    return this.status === InventoryStatus.TRADED;
  }

  isRetired(): boolean {
    return this.status === InventoryStatus.RETIRED;
  }

  isReserved(): boolean {
    return this.status === InventoryStatus.RESERVED;
  }

  getAvailableQuantity(): number {
    return this.availableQuantity;
  }
}