class LevelsController < ApplicationController
  def index
    @levels = Level.order(created_at: :desc)
  end

  def show
    @level = Level.find(params[:id])
  end

  def new
    @level = Level.new
  end

  def create
    @level = Level.new(normalized_level_params)

    if @level.save
      redirect_to @level
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
    @level = Level.find(params[:id])
  end

  def update
    @level = Level.find(params[:id])

    if @level.update(normalized_level_params)
      redirect_to @level
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @level = Level.find(params[:id])
    @level.destroy
    redirect_to levels_path
  end

  private

  def normalized_level_params
    permitted = params.require(:level).permit(:name, :map)

    if permitted[:map].is_a?(String)
      begin
        permitted[:map] = JSON.parse(permitted[:map])
      rescue JSON::ParserError
      end
    end

    permitted
  end
end
