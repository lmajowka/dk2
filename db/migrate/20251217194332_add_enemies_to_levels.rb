class AddEnemiesToLevels < ActiveRecord::Migration[8.1]
  def change
    add_column :levels, :enemies, :json, default: [], null: false
  end
end
