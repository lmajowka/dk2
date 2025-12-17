class Level < ApplicationRecord
  attribute :map, :json, default: -> { [] }
  attribute :props, :json, default: -> { [] }
  attribute :enemies, :json, default: -> { [] }

  validates :name, presence: true

  after_initialize do
    if new_record? && map.blank?
      self.map = default_map
    end
  end

  private

  def default_map
    rows = 15
    cols = 24

    grid = Array.new(rows) { Array.new(cols, 0) }
    grid[rows - 1] = Array.new(cols, 1)
    grid
  end
end
