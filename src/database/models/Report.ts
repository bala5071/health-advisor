import { Model } from '@nozbe/watermelondb';
import { field, readonly, date, relation } from '@nozbe/watermelondb/decorators';

export default class Report extends Model {
  static table = 'reports';

  static associations = {
    scans: { type: 'belongs_to', key: 'scan_id' },
  } as const;

  @field('user_id') userId: any;
  @relation('scans', 'scan_id') scan: any;
  @field('summary') summary: any;
  @field('recommendations') recommendations: any;

  @readonly @date('created_at') createdAt: any;
}
