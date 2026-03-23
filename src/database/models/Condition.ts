import { Model } from '@nozbe/watermelondb';
import { field, relation } from '@nozbe/watermelondb/decorators';

export default class Condition extends Model {
  static table = 'conditions';

  static associations = {
    health_profiles: { type: 'belongs_to', key: 'health_profile_id' },
  } as const;

  @relation('health_profiles', 'health_profile_id') healthProfile: any;
  @field('name') name: any;
  @field('notes') notes: any;
}
