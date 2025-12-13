module ApplicationHelper
  def tile_assets
    tiles_path = Rails.root.join("app", "assets", "images", "tiles")
    return [] unless tiles_path.exist?

    Dir.glob(tiles_path.join("*.png")).sort.map do |file|
      filename = File.basename(file)
      {
        id: filename.gsub(/\D/, "").to_i,
        name: filename.gsub(".png", "").titleize,
        path: "tiles/#{filename}"
      }
    end.sort_by { |t| t[:id] }
  end

  def tile_urls_json
    tile_assets.map { |t| asset_path(t[:path]) }.to_json
  end
end
