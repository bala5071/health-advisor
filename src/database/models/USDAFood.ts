import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export default class USDAFood extends Model {
  static table = 'usda_foods';

  @field('fdc_id') fdcId: any;
  @field('name') name: any;
  @field('search_name') searchName: any;
  @field('nutrients_json') nutrientsJson: any;

  @readonly @date('created_at') createdAt: any;
}
