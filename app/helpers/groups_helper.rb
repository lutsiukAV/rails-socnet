module GroupsHelper
  def getstatus(group)
    if group.status == true
      'open'
    else
      'closed'
    end
  end
end
