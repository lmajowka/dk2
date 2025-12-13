module ApplicationHelper
  GOAL_TILE_NAME = "goal".freeze

  def tile_assets
    tiles_path = Rails.root.join("app", "assets", "images", "tiles")
    return [] unless tiles_path.exist?

    tiles = Dir.glob(tiles_path.join("*.{png,svg}")).sort.map do |file|
      ext = File.extname(file)
      filename = File.basename(file, ext)
      {
        id: filename.gsub(/\D/, "").to_i,
        name: filename.titleize,
        path: "tiles/#{filename}#{ext}",
        is_goal: filename.downcase == GOAL_TILE_NAME
      }
    end

    regular_tiles = tiles.reject { |t| t[:is_goal] }.sort_by { |t| t[:id] }
    goal_tile = tiles.find { |t| t[:is_goal] }

    if goal_tile
      max_id = regular_tiles.map { |t| t[:id] }.max || 0
      goal_tile[:id] = max_id + 1
      regular_tiles + [goal_tile]
    else
      regular_tiles
    end
  end

  def goal_tile_id
    tile = tile_assets.find { |t| t[:is_goal] }
    tile ? tile[:id] : nil
  end

  def tile_urls_json
    tile_assets.map { |t| asset_path(t[:path]) }.to_json
  end
end
