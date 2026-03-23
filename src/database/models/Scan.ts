import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export default class Scan extends Model {
  static table = 'scans';

  @field('user_id') userId: any;
  @field('type') type: any;
  @field('data') data: any;

  @readonly @date('created_at') createdAt: any;
}
