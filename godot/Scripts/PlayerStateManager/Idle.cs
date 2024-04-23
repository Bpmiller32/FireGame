using Godot;

namespace FireGame;

public class Idle : BaseState
{
    public override void Enter()
    {
        GD.Print("Entered Idle");
    }

    public override PlayerStates UpdatePhysics(double delta)
    {
        if (Input.IsActionPressed("Left") || Input.IsActionPressed("Right"))
        {
            return PlayerStates.Walk;
        }
        else if (Input.IsActionPressed("Jump"))
        {
            return PlayerStates.Jump;
        }

        if (!Player.IsOnFloor())
        {
            return PlayerStates.Fall;
        }

        return PlayerStates.Null;
    }
}
