using Godot;

namespace FireGame;

public class Walk : BaseState
{
    public override void Enter()
    {
        GD.Print("Entered Walk");
        AnimationPlayer.Play("Walk");
    }

    public override void Exit()
    {
        GD.Print("Exited Walk");
        AnimationPlayer.Stop();
    }

    public override PlayerStates UpdateInput(InputEvent inputEvent)
    {
        if (Input.IsActionPressed("Jump"))
        {
            return PlayerStates.Jump;
        }

        return PlayerStates.Null;
    }

    public override PlayerStates UpdatePhysics(double delta)
    {
        if (!Player.IsOnFloor())
        {
            return PlayerStates.Fall;
        }

        int direction = 0;
        if (Input.IsActionPressed("Left") && !Input.IsActionPressed("Right"))
        {
            PlayerSprites.Scale = new(1, 1);
            direction = -1;
        }
        if (Input.IsActionPressed("Right") && !Input.IsActionPressed("Left"))
        {
            PlayerSprites.Scale = new(-1, 1);
            direction = 1;
        }

        Player.Velocity = new(direction * Player.MoveSpeed, Player.Velocity.Y + (Player.Gravity * (float)delta));
        Player.MoveAndSlide();

        if (direction == 0)
        {
            return PlayerStates.Idle;
        }

        return PlayerStates.Null;
    }
}
