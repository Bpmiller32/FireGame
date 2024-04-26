type Key = {
  keyCode: string;
  isDown: boolean;
};

type KeyList = {
  [key: string]: Key;
};

export default KeyList;
