using Godot;

namespace FireGame;

public class BaseState
{
    public Player Player { get; set; }
    public Node2D PlayerSprites { get; set; }
    public AnimationPlayer AnimationPlayer { get; set; }

    public virtual void Enter() { }
    public virtual void Exit() { }

    public virtual PlayerStates UpdateInput(InputEvent inputEvent)
    {
        return PlayerStates.Null;
    }
    public virtual PlayerStates UpdatePhysics(double delta)
    {
        return PlayerStates.Null;
    }
}