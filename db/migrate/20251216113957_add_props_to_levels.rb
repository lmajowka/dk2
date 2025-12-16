class AddPropsToLevels < ActiveRecord::Migration[8.1]
  def change
    add_column :levels, :props, :json, null: false, default: []
  end
end
