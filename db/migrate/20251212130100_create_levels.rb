class CreateLevels < ActiveRecord::Migration[8.1]
  def change
    create_table :levels do |t|
      t.string :name, null: false
      t.json :map, null: false, default: []

      t.timestamps
    end
  end
end
