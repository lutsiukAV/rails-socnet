class GroupsController < ApplicationController

  def show
    @group = Group.find(params[:id])
    @micropost = @group.microposts.build
    @feed_items = @group.feed.paginate(page: params[:page])
    @microposts = @group.microposts.paginate(page: params[:page])
  end
  def changestatus
    @group = Group.find(params[:id])
    if @group.status == true
      @group.status = false
    else
      @group.status = true
    end
    @group.save
    redirect_to @group
  end
  def destroy
    @group = Group.find(params[:id])
    Micropost.destroy_all(group_id:@group.id)
    Group.delete(@group)

    flash[:success] = "Group has been deleted"
    redirect_to groups_path
  end
  def new
    @group = Group.new
  end
  def index
    @groups = Group.all
  end
  def create
    params.permit!
    puts params
    @group = Group.new(status:params[:group][:status], name:params[:group][:name],owner_id:current_user.id)
    if @group.save
      puts @group
      flash[:success] = "Your group has been created"
      redirect_to groups_path
    else
      render 'new'
    end
  end
end
