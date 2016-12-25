class TextChatController < ApplicationController
  def list
    @messages = Message.all
    @msg = []
    @messages.each do |m|
      if m.receiver_id == current_user.id
        @msg.append([User.find(m.sender_id), m.text, m.created_at])
      end
    end
    @msg.reverse!
    render :list
  end

  def dialog
    @msgs = Message.all
    params.permit!
    @second = params[:id].to_i
    @name = User.find(@second)
    @dialogsm = []
    @msgs.each do |m|
      if (m.sender_id == current_user.id && m.receiver_id == @second) || (m.receiver_id == current_user.id && m.sender_id == @second)
        @dialogsm.append([User.find(m.sender_id).login, m.text, m.created_at])
       end
    end
    @dialogsm.reverse!
    render :dialog
  end

  def new
    @receiver_id = params[:id]
    render :new
  end

  def send_msg
    params = msg_params
    @msg = Message.new({sender_id: params[:sender], receiver_id: params[:receiver], text: params[:text]})
    @msg.save
    redirect_to messages_path
  end

  def msg_params
    params.permit(:sender, :receiver, :text)
  end
end
